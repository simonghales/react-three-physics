import React, {createContext, useCallback, useContext, useEffect, useRef} from "react"
import {useEffectRef} from "../utils/hooks";

export const useWorkerMessaging = (worker: Worker) => {

    const localStateRef = useRef<{
        subscriptionRefs: Record<string, any>,
        idCount: number,
    }>({
        subscriptionRefs: {},
        idCount: 0,
    })

    const subscribe = useCallback((callbackRef: any) => {
        const id = localStateRef.current.idCount += 1
        localStateRef.current.subscriptionRefs[id] = callbackRef
        return () => {
            delete localStateRef.current.subscriptionRefs[id]
        }
    }, [])

    const postMessage = useCallback((message: any, extraArgs?: any) => {
        worker.postMessage(message, extraArgs)
    }, [worker])

    useEffect(() => {
        const previousOnMessage: any = worker.onmessage

        worker.onmessage = (message: any) => {
            if (previousOnMessage) {
                previousOnMessage(message)
            }
            Object.values(localStateRef.current.subscriptionRefs).forEach(callbackRef => {
                callbackRef.current(message)
            })
        }

        return () => {
            worker.onmessage = previousOnMessage
        }
    }, [])

    return {
        subscribe,
        postMessage,
    }

}

const Context = createContext<{
    subscribeToWorkerMessages: (callbackRef: any) => void,
    postWorkerMessage: (message: any) => void,
}>(null!)

export const useSubscribeToWorkerMessages = (callback: any) => {
    const subscribeToWorkerMessages = useContext(Context).subscribeToWorkerMessages
    const callbackRef = useEffectRef(callback)
    useEffect(() => {
        return subscribeToWorkerMessages(callbackRef)
    }, [subscribeToWorkerMessages])
}

export const usePostWorkerMessage = () => {
    return useContext(Context).postWorkerMessage
}

export const WorkerMessagingProvider: React.FC<{
    subscribeToWorkerMessages: (callbackRef: any) => void,
    postWorkerMessage: (message: any) => void,
}> = ({children, subscribeToWorkerMessages, postWorkerMessage}) => {
    return (
        <Context.Provider value={{
            subscribeToWorkerMessages,
            postWorkerMessage,
        }}>
            {children}
        </Context.Provider>
    )
}
