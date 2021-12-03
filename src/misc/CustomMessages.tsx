import React, {createContext, MutableRefObject, useCallback, useContext, useEffect, useRef} from "react"
import {usePostWorkerMessage, useSubscribeToWorkerMessages} from "../physics/shared/WorkerMessagingProvider";
import {useEffectRef} from "../physics/utils/hooks";

export enum CustomMessagesWorkerMessageType {
    CUSTOM_MESSAGE = 'CUSTOM_MESSAGE',
}

const Context = createContext<{
    subscribe: (key: string, callbackRef: MutableRefObject<any>) => any,
    sendCustomMessage: (key: string, data: any) => any,
}>(null!)

export const useSendCustomMessage = () => {
    return useContext(Context).sendCustomMessage
}

export const useOnCustomMessage = (key: string, callback: any) => {
    const callbackRef = useEffectRef(callback)
    const subscribe = useContext(Context).subscribe
    useEffect(() => {
        return subscribe(key, callbackRef)
    }, [])
}

export const CustomMessages: React.FC = ({children}) => {

    const localStateRef = useRef<{
        subscriptions: Record<string, Record<string, MutableRefObject<any>>>,
        idCount: number,
    }>({
        subscriptions: {},
        idCount: 0,
    })

    const subscribe = useCallback((key: string, callbackRef: MutableRefObject<any>) => {
        const id = localStateRef.current.idCount += 1
        if (!localStateRef.current.subscriptions[key]) {
            localStateRef.current.subscriptions[key] = {}
        }
        localStateRef.current.subscriptions[key][id] = callbackRef
        return () => {
            delete localStateRef.current.subscriptions[key][id]
            if (Object.keys(localStateRef.current.subscriptions[key]).length === 0) {
                delete localStateRef.current.subscriptions[key]
            }
        }
    }, [])

    const postMessage = usePostWorkerMessage()

    const sendCustomMessage = useCallback((key: string, data: any) => {
        postMessage({
            type: CustomMessagesWorkerMessageType.CUSTOM_MESSAGE,
            key,
            data,
        })
    }, [])

    useSubscribeToWorkerMessages((message: any) => {
        const data = message.data
        if (!data) return
        switch (data?.type) {
            case CustomMessagesWorkerMessageType.CUSTOM_MESSAGE:
                const key = data?.key ?? ''
                const value = data?.data
                if (localStateRef.current.subscriptions[key]) {
                    Object.values(localStateRef.current.subscriptions[key]).forEach(callbackRef => {
                        callbackRef.current(value)
                    })
                }
                break;
        }
    })

    return (
        <Context.Provider value={{
            subscribe,
            sendCustomMessage,
        }}>
            {children}
        </Context.Provider>
    )
}
