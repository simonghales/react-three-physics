import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from "react"
import {usePostWorkerMessage, useSubscribeToWorkerMessages} from "../physics/shared/WorkerMessagingProvider";

export enum SyncableComponentsWorkerMessageType {
    READY_TO_RECEIVE = 'READY_TO_RECEIVE',
    READY_TO_RECEIVE_ACKNOWLEDGED = 'READY_TO_RECEIVE_ACKNOWLEDGED',
    SYNC_COMPONENT = 'SYNC_COMPONENT',
    SYNCED_COMPONENT_PROP_UPDATE = 'SYNCED_COMPONENT_PROP_UPDATE',
    REMOVE_SYNCED_COMPONENT = 'REMOVE_SYNCED_COMPONENT',
}

const SyncedComponent: React.FC<{
    id: string,
    props: Record<string, any>,
    component: any,
}> = ({id, props, component: Component}) => {
    return <Component id={id} {...props}/>
}

const HandleSyncedData: React.FC<{
    components: Record<string, React.FC>
}> = ({components}) => {
    const [syncedData, setSyncedData] = useState<Record<string, {
        componentId: string,
        props: Record<string, any>,
    }>>({})

    const {
        addComponent,
        updateComponentProp,
        removeComponent,
    } = useMemo(() => {
        return {
            addComponent: (data: any) => {
                const {
                    id = '',
                    componentId = '',
                    props = {},
                } = data

                if (!id || !componentId) return

                setSyncedData(state => ({
                    ...state,
                    [id]: {
                        componentId,
                        props,
                    }
                }))
            },
            updateComponentProp: (data: any) => {

                const {
                    id = '',
                    propKey = '',
                    propValue = ''
                } = data

                if (!id || !propKey) return

                setSyncedData(state => {
                    if (!state[id]) return state
                    return {
                        ...state,
                        [id]: {
                            ...state[id],
                            props: {
                                ...state[id].props,
                                [propKey]: propValue,
                            }
                        }
                    }
                })
            },
            removeComponent: (data: any) => {
                const {
                    id = '',
                } = data

                if (!id) return

                setSyncedData(state => {
                    const update = {
                        ...state,
                    }
                    delete update[id]
                    return update
                })
            },
        }
    }, [])

    useSubscribeToWorkerMessages((message: any) => {
        const data = message.data

        if (!data) return

        switch (data?.type) {
            case SyncableComponentsWorkerMessageType.SYNC_COMPONENT:
                addComponent(data)
                break;
            case SyncableComponentsWorkerMessageType.SYNCED_COMPONENT_PROP_UPDATE:
                updateComponentProp(data)
                break;
            case SyncableComponentsWorkerMessageType.REMOVE_SYNCED_COMPONENT:
                removeComponent(data)
                break;
        }
    })

    return (
        <>
            {
                Object.entries(syncedData).map(([id, data]) => {
                    const component = components[data.componentId]
                    if (!component) return null
                    return (
                        <SyncedComponent id={id} props={data.props} component={component} key={`${id}:${data.componentId}`}/>
                    )
                })
            }
        </>
    )
}

const Context = createContext<{
    addComponent: (id: string, componentId: string, props: Record<string, any>) => () => void,
    updateComponentProp: (id: string, propKey: string, propValue: any) => void,
    workerReady: boolean,
}>(null!)

const SyncComponentProp: React.FC<{
    id: string,
    propKey: string,
    propValue: any,
    updateComponentProp: any,
}> = ({id, propKey, propValue, updateComponentProp}) => {

    const firstUpdateRef = useRef(true)

    useEffect(() => {
        if (firstUpdateRef.current) {
            firstUpdateRef.current = false
            return
        }
        updateComponentProp(id, propKey, propValue)
    }, [propValue])

    return null
}

export const SyncComponent: React.FC<{
    id: string,
    componentId: string,
    [key: string]: any,
}> = ({id, componentId, ...props}) => {

    const {
        addComponent,
        updateComponentProp,
        workerReady,
    } = useContext(Context)

    useEffect(() => {
        if (!workerReady) return
        return addComponent(id, componentId, props)
    }, [workerReady])

    if (!workerReady) return null

    return (
        <>
            {
                Object.entries(props).map(([propKey, propValue]) => (
                    <SyncComponentProp id={id} updateComponentProp={updateComponentProp} propKey={propKey} propValue={propValue} key={propKey}/>
                ))
            }
        </>
    )
}

export const SyncableComponents: React.FC<{
    components: Record<string, React.FC<any>>
}> = ({children, components}) => {

    const [workerReady, setWorkerReady] = useState(false)
    const [workerReadyAcknowledged, setWorkerReadyAcknowledged] = useState(false)

    const postWorkerMessage = usePostWorkerMessage()

    useSubscribeToWorkerMessages((message: any) => {
        const data = message.data

        if (!data) return

        switch (data?.type) {
            case SyncableComponentsWorkerMessageType.READY_TO_RECEIVE:
                setWorkerReady(true)
                break;
            case SyncableComponentsWorkerMessageType.READY_TO_RECEIVE_ACKNOWLEDGED:
                setWorkerReadyAcknowledged(true)
                break;
        }
    })

    useEffect(() => {
        if (!workerReadyAcknowledged) {
            const send = () => {
                postWorkerMessage({
                    type: SyncableComponentsWorkerMessageType.READY_TO_RECEIVE,
                })
            }
            send()
            const interval = setInterval(send, 50)
            return () => {
                clearInterval(interval)
            }
        }
    }, [workerReadyAcknowledged])

    useEffect(() => {
        if (workerReady && !workerReadyAcknowledged) {
            const send = () => {
                postWorkerMessage({
                    type: SyncableComponentsWorkerMessageType.READY_TO_RECEIVE_ACKNOWLEDGED,
                })
            }
            send()
            const interval = setInterval(send, 50)
            return () => {
                clearInterval(interval)
            }
        }
    }, [workerReady, workerReadyAcknowledged])

    const {
        addComponent,
        updateComponentProp,
    } = useMemo(() => {
        return {
            addComponent: (id: string, componentId: string, props: Record<string, any>) => {
                postWorkerMessage({
                    type: SyncableComponentsWorkerMessageType.SYNC_COMPONENT,
                    id,
                    componentId,
                    props,
                })
              return () => {
                  postWorkerMessage({
                      type: SyncableComponentsWorkerMessageType.REMOVE_SYNCED_COMPONENT,
                      id,
                  })
              }
            },
            updateComponentProp: (id: string, propKey: string, propValue: any) => {
                postWorkerMessage({
                    type: SyncableComponentsWorkerMessageType.SYNCED_COMPONENT_PROP_UPDATE,
                    id,
                    propKey,
                    propValue,
                })
            },
        }
    }, [postWorkerMessage])

    return (
        <Context.Provider value={{
            addComponent,
            updateComponentProp,
            workerReady,
        }}>
            <HandleSyncedData components={components}/>
            {children}
        </Context.Provider>
    )
}
