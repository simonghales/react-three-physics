import React, {useState} from "react"
import {useSubscribeToWorkerMessages} from "../physics/shared/WorkerMessagingProvider";

export enum SyncableComponentsWorkerMessageType {
    SYNC_COMPONENT = 'SYNC_COMPONENT',
    SYNCED_COMPONENT_PROP_UPDATE = 'SYNCED_COMPONENT_PROP_UPDATE',
    REMOVE_SYNCED_COMPONENT = 'REMOVE_SYNCED_COMPONENT',
}

const HandleSyncedData: React.FC<{
    components: Record<string, React.FC>
}> = ({components}) => {
    const [syncedData, setSyncedData] = useState<Record<string, {
        componentId: string,
        props: Record<string, any>,
    }>>({})

    useSubscribeToWorkerMessages((message: any) => {
        const data = message.data

        switch (data?.type) {
            case SyncableComponentsWorkerMessageType.SYNC_COMPONENT:
                /*
                    get id, componentType, and initial props
                 */
                // todo - handle data...
                break;
            case SyncableComponentsWorkerMessageType.SYNCED_COMPONENT_PROP_UPDATE:
                /*
                    get id, prop key and prop value
                 */
                break;
            case SyncableComponentsWorkerMessageType.REMOVE_SYNCED_COMPONENT:
                /*
                    get id
                 */
                break;
        }
    })

    return (
        <>
        </>
    )
}

export const SyncableComponents: React.FC<{
    components: Record<string, React.FC>
}> = ({children, components}) => {

    return (
        <>
            <HandleSyncedData components={components}/>
            {children}
        </>
    )
}
