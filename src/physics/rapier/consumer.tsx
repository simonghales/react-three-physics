import React, {MutableRefObject, useState} from "react";
import {DEFAULT_NUMBER_OF_PHYSICS_OBJECTS} from "../config";
import {Object3D} from "three";
import {generateRapierBuffers, RapierBuffersData} from "./buffers";
import {PhysicsConsumer} from "../PhysicsConsumer";

let xIndex: number = 0
let yIndex: number = 0
let zIndex: number = 0

let xQIndex: number = 0
let yQIndex: number = 0
let zQIndex: number = 0
let wQIndex: number = 0

const mapBufferDataToObjectRef = (buffers: RapierBuffersData, index: number, objectRef: MutableRefObject<Object3D>) => {

    xIndex = index * 3
    yIndex = (index * 3) + 1
    zIndex = (index * 3) + 2

    xQIndex = (index * 4)
    yQIndex = (index * 4) + 1
    zQIndex = (index * 4) + 2
    wQIndex = (index * 4) + 3

    if (!objectRef.current) return

    objectRef.current.position.set(buffers.positions[xIndex], buffers.positions[yIndex], buffers.positions[zIndex])
    objectRef.current.quaternion.set(buffers.quaternions[xQIndex], buffers.quaternions[yQIndex], buffers.quaternions[zQIndex], buffers.quaternions[wQIndex])

}

export const RapierPhysicsConsumer: React.FC<{
    worker: Worker,
    maxNumberOfPhysicsObjects?: number,
    stepRate?: number,
}> = ({maxNumberOfPhysicsObjects = DEFAULT_NUMBER_OF_PHYSICS_OBJECTS, ...props}) => {

    const [buffers] = useState(() => generateRapierBuffers(maxNumberOfPhysicsObjects))
    return <PhysicsConsumer mapBufferDataToObjectRef={mapBufferDataToObjectRef} buffers={buffers} {...props}/>

}
