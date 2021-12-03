import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react"
import {usePostWorkerMessage, useSubscribeToWorkerMessages} from "../physics/shared/WorkerMessagingProvider";

export enum SyncDataWorkerMessageType {
    SYNC_DATA = 'SYNC_DATA',
    SYNC_DATA_WORKER_READY = 'SYNC_DATA_WORKER_READY',
    SYNC_DATA_WORKER_READY_ACKNOWLEDGED = 'SYNC_DATA_WORKER_READY_ACKNOWLEDGED',
}

const Context = createContext<{
    subscribe: (key: string, callback: any) => () => void,
    workerReady: boolean,
}>(null!)

export const useSyncData = (key: string, defaultValue: any) => {
    const [state, setState] = useState(defaultValue)
    const {
        subscribe,
    } = useContext(Context)
    useEffect(() => {
        return subscribe(key, setState)
    }, [])
    return state
}

export const useTransmitData = (key: string, value: any) => {

    const postMessage = usePostWorkerMessage()

    const {
        workerReady,
    } = useContext(Context)

    useEffect(() => {
        if (!workerReady) return
        postMessage({
            type: SyncDataWorkerMessageType.SYNC_DATA,
            key,
            value,
        })
    }, [key, value, workerReady])
}

export const SyncData: React.FC = ({children}) => {

    const [workerReady, setWorkerReady] = useState(false)
    const [workerReadyAcknowledged, setWorkerReadyAcknowledged] = useState(false)

    const postMessage = usePostWorkerMessage()

    useEffect(() => {
        if (workerReadyAcknowledged) return
        const send = () => {
            postMessage({
                type: SyncDataWorkerMessageType.SYNC_DATA_WORKER_READY,
            })
        }
        send()
        const interval = setInterval(send, 50)
        return () => {
            clearInterval(interval)
        }
    }, [workerReadyAcknowledged])

    const localStateRef = useRef<{
        subscriptions: Record<string, Record<string, any>>,
        idCount: number,
    }>({
        subscriptions: {},
        idCount: 0,
    })

    const subscribe = useCallback((key: string, callback: any) => {
        const id = localStateRef.current.idCount += 1
        if (!localStateRef.current.subscriptions[key]) {
            localStateRef.current.subscriptions[key] = {}
        }
        localStateRef.current.subscriptions[key][id] = callback
        return () => {
            delete localStateRef.current.subscriptions[key][id]
            if (Object.keys(localStateRef.current.subscriptions[key]).length === 0) {
                delete localStateRef.current.subscriptions[key]
            }
        }
    }, [])

    useSubscribeToWorkerMessages((message: any) => {
        const data = message.data
        if (!data) return
        switch (data?.type) {
            case SyncDataWorkerMessageType.SYNC_DATA_WORKER_READY:
                setWorkerReady(true)
                postMessage({
                    type: SyncDataWorkerMessageType.SYNC_DATA_WORKER_READY_ACKNOWLEDGED,
                })
                break;
            case SyncDataWorkerMessageType.SYNC_DATA_WORKER_READY_ACKNOWLEDGED:
                setWorkerReadyAcknowledged(true)
                break;
            case SyncDataWorkerMessageType.SYNC_DATA:
                const {
                    key = '',
                    value,
                } = data
                if (localStateRef.current.subscriptions[key]) {
                    Object.values(localStateRef.current.subscriptions[key]).forEach(callback => {
                        callback(value)
                    })
                }
                break;
        }
    })

    return (
        <Context.Provider value={{
            subscribe,
            workerReady,
        }}>
            {children}
        </Context.Provider>
    )
}
