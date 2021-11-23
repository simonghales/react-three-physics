import React, {createContext, MutableRefObject, useCallback, useContext, useEffect, useRef, useState} from "react"
import {PhysicsStepper} from "./PhysicsStepper";
import {DEFAULT_NUMBER_OF_PHYSICS_OBJECTS, DEFAULT_STEP_RATE} from "./config";
import {useEffectRef} from "./utils/hooks";
import {ConvertBodyDataToBufferDataFn, CopyBodyDataFn, GetBodyDataFn, MainMessages, WorkerMessages} from "./types";
import {getNow} from "./utils/time";
import {useWorkerMessaging, WorkerMessagingProvider} from "./shared/WorkerMessagingProvider";

export type SubscribeFnRef = MutableRefObject<(delta: number) => void>

export const PhysicsProviderContext = createContext<{
    removeBody: (id: string) => void,
    addBody: (id: string, body: any) => () => void,
    subscribe: (callbackRef: SubscribeFnRef) => () => void,
}>(null!)

export const useAddBody = () => {
    return useContext(PhysicsProviderContext).addBody
}

export const useOnPhysicsUpdate = (callback: (delta: number) => void) => {

    const {
        subscribe,
    } = useContext(PhysicsProviderContext)

    const callbackRef = useEffectRef(callback)

    useEffect(() => {
        return subscribe(callbackRef)
    }, [subscribe])

}

export const usePhysicsSubscriptions = () => {

    const localStateRef = useRef<{
        subscriptions: Record<string, SubscribeFnRef>,
        idCount: number,
    }>({
        subscriptions: {},
        idCount: 0,
    })

    const subscribe = useCallback((callbackRef: SubscribeFnRef) => {
        const id = localStateRef.current.idCount += 1
        localStateRef.current.subscriptions[id] = callbackRef
        return () => {
            delete localStateRef.current.subscriptions[id]
        }
    }, [])

    const updateSubscriptions = useCallback((delta: number) => {
        Object.values(localStateRef.current.subscriptions).forEach((callbackRef) => {
            callbackRef.current(delta)
        })
    }, [])

    return {
        subscribe,
        updateSubscriptions,
    }

}

export const useSyncedBodies = (
    stepRate: number,
    getBodyData: GetBodyDataFn,
    copyBodyData: CopyBodyDataFn,
    convertBodyDataToBufferData: ConvertBodyDataToBufferDataFn,
) => {

    const localStateRef = useRef<{
        previousBodiesData: Record<string, any>,
        latestBodiesData: Record<string, any>,
        storedBodies: Record<string, any>,
        bodiesOrder: string[],
        updatedBodies: boolean,
        lastUpdate: number,
    }>({
        previousBodiesData: {},
        latestBodiesData: {},
        storedBodies: {},
        bodiesOrder: [],
        updatedBodies: false,
        lastUpdate: getNow(),
    })

    const removeBody = useCallback((id: string) => {
        const index = localStateRef.current.bodiesOrder.indexOf(id)
        localStateRef.current.bodiesOrder.splice(index, 1)
        delete localStateRef.current.storedBodies[id]
        delete localStateRef.current.latestBodiesData[id]
        delete localStateRef.current.previousBodiesData[id]
        localStateRef.current.updatedBodies = true
    }, [])

    const addBody = useCallback((id: string, body: any) => {
        localStateRef.current.storedBodies[id] = body
        localStateRef.current.bodiesOrder.push(id)
        localStateRef.current.updatedBodies = true
        localStateRef.current.latestBodiesData[id] = getBodyData(body, localStateRef.current.latestBodiesData[id])
        localStateRef.current.previousBodiesData[id] = getBodyData(body, localStateRef.current.previousBodiesData[id])
        return () => removeBody(id)
    }, [removeBody, getBodyData])

    const updateBodies = useCallback(() => {

        Object.entries(localStateRef.current.storedBodies).forEach(([id, body]) => {
            if (localStateRef.current.latestBodiesData[id]) {
                localStateRef.current.previousBodiesData[id] = copyBodyData(localStateRef.current.latestBodiesData[id], localStateRef.current.previousBodiesData[id])
            }
            localStateRef.current.latestBodiesData[id] = getBodyData(body, localStateRef.current.latestBodiesData[id])
        })

        localStateRef.current.lastUpdate = getNow()

    }, [getBodyData])

    const calculateProgress = useCallback(() => {

        const lastUpdate = localStateRef.current.lastUpdate
        const now = getNow()

        const timeSinceLastUpdate = now - lastUpdate

        let progress = timeSinceLastUpdate / stepRate

        if (progress > 1) {
            progress = 1
        }

        if (progress < 0) {
            progress = 0
        }

        return progress
    }, [stepRate])

    const getBodiesBufferData = useCallback((buffers: any) => {
        const progress = calculateProgress()
        Object.entries(localStateRef.current.latestBodiesData).forEach(([id, currentData]) => {
            const previousData = localStateRef.current.previousBodiesData[id]
            const bodyIndex = localStateRef.current.bodiesOrder.indexOf(id)
            convertBodyDataToBufferData(previousData, currentData, buffers, bodyIndex, progress)
        })
        if (localStateRef.current.updatedBodies) {
            localStateRef.current.updatedBodies = false
            return {
                bodiesOrder: localStateRef.current.bodiesOrder,
            }
        }
        return {}
    }, [convertBodyDataToBufferData, calculateProgress])

    return {
        removeBody,
        addBody,
        updateBodies,
        getBodiesBufferData,
    }

}

const useHandleWorkerStepMessaging = (
    buffers: any,
    subscribeToWorkerMessages: any,
    postWorkerMessage: any,
    getBodiesBufferData: any,
) => {

    const onMessage = useCallback((message: any) => {

        const data = message.data

        if (data?.type === MainMessages.REQUEST_FRAME) {

            Object.entries(data.buffers).forEach(([id, buffer]) => {
                buffers[id] = buffer
            })

            const updateData = getBodiesBufferData(buffers)

            const transfer: any[] = []
            Object.values(buffers).forEach((buffer: any) => {
                transfer.push(buffer.buffer)
            })

            postWorkerMessage({
                ...updateData,
                type: WorkerMessages.FRAME,
                buffers,
            }, transfer)
        }


    }, [])

    const onMessageRef = useEffectRef(onMessage)

    useEffect(() => {
        return subscribeToWorkerMessages(onMessageRef)
    }, [])

}

export const PhysicsProvider: React.FC<{
    worker: Worker,
    paused: boolean,
    getBodyData: GetBodyDataFn,
    copyBodyData: CopyBodyDataFn
    stepRate?: number,
    maxNumberOfPhysicsObjects?: number,
    generateBuffers: (maxNumberOfPhysicsObjects: number) => any,
    convertBodyDataToBufferData: ConvertBodyDataToBufferDataFn,
    stepWorld: (delta: number) => void,
}> = ({
                                        children,
                                        worker,
                                        getBodyData,
                                        copyBodyData,
                                        stepRate = DEFAULT_STEP_RATE,
                                        paused,
                                        generateBuffers,
                                        maxNumberOfPhysicsObjects = DEFAULT_NUMBER_OF_PHYSICS_OBJECTS,
                                        convertBodyDataToBufferData,
                                        stepWorld,
                                    }) => {

    const [buffers] = useState(() => generateBuffers(maxNumberOfPhysicsObjects))

    const {
        subscribe: subscribeToWorkerMessages,
        postMessage: postWorkerMessage,
    } = useWorkerMessaging(worker)

    const {
        removeBody,
        addBody,
        updateBodies,
        getBodiesBufferData,
    } = useSyncedBodies(stepRate, getBodyData, copyBodyData, convertBodyDataToBufferData)

    useHandleWorkerStepMessaging(buffers, subscribeToWorkerMessages, postWorkerMessage, getBodiesBufferData)

    const onWorldStep = useCallback((delta: number) => {

        postWorkerMessage({
            type: WorkerMessages.PHYSICS_STEP,
            delta,
        })

        updateBodies()

    }, [updateBodies, postWorkerMessage])

    const {
        subscribe,
        updateSubscriptions,
    } = usePhysicsSubscriptions()

    return (
        <PhysicsProviderContext.Provider value={{
            subscribe,
            removeBody,
            addBody,
        }}>
            <WorkerMessagingProvider subscribeToWorkerMessages={subscribeToWorkerMessages}
                                     postWorkerMessage={postWorkerMessage}>
                <PhysicsStepper updateSubscriptions={updateSubscriptions} stepWorld={stepWorld} onWorldStep={onWorldStep} stepRate={stepRate} paused={paused}/>
                {children}
            </WorkerMessagingProvider>
        </PhysicsProviderContext.Provider>
    )
}
