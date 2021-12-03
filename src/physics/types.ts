import {MutableRefObject} from "react";
import {Object3D} from "three";

export type ConvertBodyDataToBufferDataFn = (prevBodyData: any, currentBodyData: any, buffers: any, bodyIndex: number, progress: number) => any
export type GetBodyDataFn = (body: any, targetBodyData: any) => any
export type CopyBodyDataFn = (bodyData: any, targetBodyData: any) => any

export type MapBufferDataToObjectRefFn = (buffers: any, index: number, objectRef: MutableRefObject<Object3D>) => void


export enum MainMessages {
    REQUEST_FRAME = '_REQUEST_FRAME',
}

export enum WorkerMessages {
    WORKER_READY = '_WORKER_READY',
    WORKER_READY_ACKNOWLEDGED = '_WORKER_READY_ACKNOWLEDGED',
    PHYSICS_STEP = '_PHYSICS_STEP',
    FRAME = '_FRAME',
}
