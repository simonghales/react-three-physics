import React, {createContext, MutableRefObject, useCallback, useContext, useEffect, useRef, useState} from "react"
import {MainMessages, MapBufferDataToObjectRefFn, WorkerMessages} from "./types";
import {useFrame} from "@react-three/fiber";
import {useEffectRef, useSubscriptionCallbacks} from "./utils/hooks";
import {DEFAULT_STEP_RATE} from "./config";
import {Object3D} from "three";
import {useWorkerMessaging, WorkerMessagingProvider} from "./shared/WorkerMessagingProvider";
import {SyncData} from "../misc/SyncData";
import {CustomMessages} from "../misc/CustomMessages";

const areBuffersReady = (buffers: any) => {
    return Object.values(buffers).reduce((safe: boolean, buffer: any) => {
        if (buffer.byteLength === 0) return false
        return safe
    }, true)
}

export type SubscriptionCallback = () => void

const usePhysicsSubscriptions = (mapBufferDataToObjectRef: MapBufferDataToObjectRefFn) => {

    const {
        subscribe,
        callSubscriptions,
    } = useSubscriptionCallbacks()

    const localStateRef = useRef<{
        bodiesOrder: Record<string, number>,
        subscribedObjects: Record<string, Record<string, MutableRefObject<Object3D>>>,
        subscribedCallbacks: Record<string, SubscriptionCallback[]>,
        idCount: number,
    }>({
        bodiesOrder: {},
        subscribedObjects: {},
        subscribedCallbacks: {},
        idCount: 0,
    })

    const updateSubscribedObjects = useCallback((buffers: any) => {
        Object.entries(localStateRef.current.bodiesOrder).forEach(([id, index]) => {
            const objects = localStateRef.current.subscribedObjects[id]
            if (objects) {
                Object.values(objects).forEach(objectRef => {
                    if (!objectRef.current) return
                    objectRef.current.visible = true
                    mapBufferDataToObjectRef(buffers, index, objectRef)
                })
            }
            const callbacks = localStateRef.current.subscribedCallbacks[id]
            if (callbacks) {
                callbacks.forEach((callback: any) => {
                    callback(buffers, index)
                })
            }
        })
    }, [mapBufferDataToObjectRef])

    const subscribeObject = useCallback((id: string, objectRef: MutableRefObject<Object3D>) => {
        if (!objectRef.current) return
        objectRef.current.visible = false
        if (!localStateRef.current.subscribedObjects[id]) {
            localStateRef.current.subscribedObjects[id] = {}
        }
        const localId = localStateRef.current.idCount += 1
        localStateRef.current.subscribedObjects[id][localId] = objectRef
        return () => {
            if (localStateRef.current.subscribedObjects[id]) {
                delete localStateRef.current.subscribedObjects[id][localId]
            }
            if (Object.keys(localStateRef.current.subscribedObjects[id]).length === 0) {
                delete localStateRef.current.subscribedObjects[id]
            }
        }
    }, [])

    const subscribeCallback = useCallback((id: string, callback: SubscriptionCallback) => {
        if (!localStateRef.current.subscribedCallbacks[id]) {
            localStateRef.current.subscribedCallbacks[id] = []
        }
        localStateRef.current.subscribedCallbacks[id].push(callback)
        return () => {
            const index = localStateRef.current.subscribedCallbacks[id].indexOf(callback)
            localStateRef.current.subscribedCallbacks[id].splice(index, 1)
            if (localStateRef.current.subscribedCallbacks[id].length === 0) {
                delete localStateRef.current.subscribedCallbacks[id]
            }
        }
    }, [])

    const updateBodiesOrder = useCallback((order: string[]) => {
        order.forEach((id, index) => {
            localStateRef.current.bodiesOrder[id] = index
        })
        Object.keys(localStateRef.current.bodiesOrder).forEach((id) => {
            if (!order.includes(id)) {
                delete localStateRef.current.bodiesOrder[id]
            }
        })
    }, [])

    return {
        updateBodiesOrder,
        subscribe,
        callSubscriptions,
        subscribeObject,
        subscribeCallback,
        updateSubscribedObjects,
    }

}

let lastUpdate = 0
let now = 0
let timeSince = 0

const useGetDelta = (stepRate: number) => {

    const localStateRef = useRef({
        lastUpdate: 0,
    })

    const getDelta = useCallback(() => {

        lastUpdate = localStateRef.current.lastUpdate
        now = Date.now()
        localStateRef.current.lastUpdate = now

        if (!lastUpdate) {
            return 1
        }

        timeSince = now - lastUpdate

        return timeSince / stepRate

    }, [stepRate])

    return {
        getDelta,
    }

}

const Context = createContext<{
    subscribeToOnPhysicsUpdate: (ref: MutableRefObject<(delta: number) => void>) => any,
    subscribeObject: (id: string, ref: MutableRefObject<Object3D>) => any,
    subscribeCallback: (id: string, callback: any) => any,
}>(null!)

export const useOnPhysicsUpdate = (callback: (delta: number) => void) => {

    const {
        subscribeToOnPhysicsUpdate
    } = useContext(Context)

    const callbackRef = useEffectRef(callback)

    useEffect(() => {
        return subscribeToOnPhysicsUpdate(callbackRef)
    }, [])

}

export const usePhysicsSubscription = (id: string, callback: any) => {

    const {
        subscribeCallback,
    } = useContext(Context)

    useEffect(() => {
        return subscribeCallback(id, callback)
    }, [id, callback])

}

export const usePhysicsRef = (id: string, active: boolean = true) => {

    const {
        subscribeObject,
    } = useContext(Context)

    const ref = useRef<any>()

    useEffect(() => {
        if (active) {
            return subscribeObject(id, ref)
        }
    }, [active])

    return ref
}

export type PhysicsConsumerProps = {
    worker: Worker,
    buffers: any,
    stepRate?: number,
    mapBufferDataToObjectRef: MapBufferDataToObjectRefFn,
}

export const PhysicsConsumer: React.FC<PhysicsConsumerProps> = ({children, worker, buffers, stepRate = DEFAULT_STEP_RATE, mapBufferDataToObjectRef}) => {

    const {
        getDelta,
    } = useGetDelta(stepRate)

    const [workerReady, setWorkerReady] = useState(false)
    const [workerReadyAcknowledged, setWorkerReadyAcknowledged] = useState(false)

    const {
        updateBodiesOrder,
        subscribe: subscribeToOnPhysicsUpdate,
        callSubscriptions: callOnPhysicsUpdateSubscriptions,
        subscribeObject,
        subscribeCallback,
        updateSubscribedObjects,
    } = usePhysicsSubscriptions(mapBufferDataToObjectRef)

    const loop = useCallback(() => {
        if (!workerReady) return
        if (areBuffersReady(buffers)) {
            const transfer: any[] = []
            Object.values(buffers).forEach((buffer: any) => {
                transfer.push(buffer.buffer)
            })
            worker.postMessage({
                type: MainMessages.REQUEST_FRAME,
                buffers,
            }, transfer)
        }
    }, [worker, buffers, workerReady])

    useFrame(loop)

    const {
        subscribe: subscribeToWorkerMessages,
        postMessage: postWorkerMessage,
    } = useWorkerMessaging(worker)

    useEffect(() => {
        if (!workerReadyAcknowledged) {
            const message = () => {
                worker.postMessage({
                    type: WorkerMessages.WORKER_READY,
                })
            }
            message()
            const interval = setInterval(message, 50)
            return () => {
                clearInterval(interval)
            }
        }
    }, [workerReadyAcknowledged])

    const onMessage = useCallback((message: any) => {
        const data = message.data

        switch (data?.type) {
            case WorkerMessages.WORKER_READY:
                setWorkerReady(true)
                worker.postMessage({
                    type: WorkerMessages.WORKER_READY_ACKNOWLEDGED,
                })
                break;
            case WorkerMessages.WORKER_READY_ACKNOWLEDGED:
                setWorkerReadyAcknowledged(true)
                break;
            case WorkerMessages.PHYSICS_STEP:

                const delta = getDelta()

                callOnPhysicsUpdateSubscriptions(delta)
                break;
            case WorkerMessages.FRAME:

                if (data.bodiesOrder) {
                    updateBodiesOrder(data.bodiesOrder as string[])
                }

                Object.entries(data.buffers).forEach(([id, buffer]) => {
                    buffers[id] = buffer
                })

                updateSubscribedObjects(buffers)

                break;
        }
    }, [])

    const onMessageRef = useEffectRef(onMessage)

    useEffect(() => {
        return subscribeToWorkerMessages(onMessageRef)
    }, [subscribeToWorkerMessages])

    return (
        <Context.Provider value={{
            subscribeToOnPhysicsUpdate,
            subscribeObject,
            subscribeCallback,
        }}>
            <WorkerMessagingProvider postWorkerMessage={postWorkerMessage} subscribeToWorkerMessages={subscribeToWorkerMessages}>
                <CustomMessages>
                    <SyncData>
                        {children}
                    </SyncData>
                </CustomMessages>
            </WorkerMessagingProvider>
        </Context.Provider>
    )
}
