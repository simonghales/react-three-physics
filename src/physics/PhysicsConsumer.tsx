import React, {createContext, MutableRefObject, useCallback, useContext, useEffect, useRef} from "react"
import {MainMessages, MapBufferDataToObjectRefFn, WorkerMessages} from "./types";
import {useFrame} from "@react-three/fiber";
import {useEffectRef, useSubscriptionCallbacks} from "./utils/hooks";
import {DEFAULT_STEP_RATE} from "./config";
import {Object3D} from "three";
import {useWorkerMessaging, WorkerMessagingProvider} from "./shared/WorkerMessagingProvider";

const areBuffersReady = (buffers: any) => {
    return Object.values(buffers).reduce((safe: boolean, buffer: any) => {
        if (buffer.byteLength === 0) return false
        return safe
    }, true)
}

const usePhysicsSubscriptions = (mapBufferDataToObjectRef: MapBufferDataToObjectRefFn) => {

    const {
        subscribe,
        callSubscriptions,
    } = useSubscriptionCallbacks()

    const localStateRef = useRef<{
        bodiesOrder: Record<string, number>,
        subscribedObjects: Record<string, Record<string, MutableRefObject<Object3D>>>,
        idCount: number,
    }>({
        bodiesOrder: {},
        subscribedObjects: {},
        idCount: 0,
    })

    const updateSubscribedObjects = useCallback((buffers: any) => {
        Object.entries(localStateRef.current.bodiesOrder).forEach(([id, index]) => {
            const objects = localStateRef.current.subscribedObjects[id]
            if (objects) {
                Object.values(objects).forEach(objectRef => {
                    mapBufferDataToObjectRef(buffers, index, objectRef)
                })
            }
        })
    }, [mapBufferDataToObjectRef])

    const subscribeObject = useCallback((id: string, objectRef: MutableRefObject<Object3D>) => {
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

export const usePhysicsRef = (id: string) => {

    const {
        subscribeObject,
    } = useContext(Context)

    const ref = useRef<any>()

    useEffect(() => {
        return subscribeObject(id, ref)
    }, [])

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

    const {
        updateBodiesOrder,
        subscribe: subscribeToOnPhysicsUpdate,
        callSubscriptions: callOnPhysicsUpdateSubscriptions,
        subscribeObject,
        updateSubscribedObjects,
    } = usePhysicsSubscriptions(mapBufferDataToObjectRef)

    const loop = useCallback(() => {
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
    }, [worker, buffers])

    useFrame(loop)

    const {
        subscribe: subscribeToWorkerMessages,
        postMessage: postWorkerMessage,
    } = useWorkerMessaging(worker)

    const onMessage = useCallback((message: any) => {
        const data = message.data

        switch (data?.type) {
            case WorkerMessages.PHYSICS_STEP:

                const delta = getDelta()

                callOnPhysicsUpdateSubscriptions(delta)
                break;
            case WorkerMessages.FRAME:

                Object.entries(data.buffers).forEach(([id, buffer]) => {
                    buffers[id] = buffer
                })

                updateSubscribedObjects(buffers)

                if (data.bodiesOrder) {
                    updateBodiesOrder(data.bodiesOrder as string[])
                }

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
        }}>
            <WorkerMessagingProvider postWorkerMessage={postWorkerMessage} subscribeToWorkerMessages={subscribeToWorkerMessages}>
                {children}
            </WorkerMessagingProvider>
        </Context.Provider>
    )
}
