import React, {MutableRefObject, useState} from "react"
import {PhysicsConsumer} from "../PhysicsConsumer";
import {generatePlanckjsBuffers, PlanckjsBuffersData} from "./buffers";
import {DEFAULT_NUMBER_OF_PHYSICS_OBJECTS} from "../config";
import {Object3D} from "three";

let xIndex: number = 0
let yIndex: number = 0
let angleIndex: number = 0

const mapBufferDataToObjectRef = (buffers: PlanckjsBuffersData, index: number, objectRef: MutableRefObject<Object3D>) => {

    xIndex = index * 2
    yIndex = (index * 2) + 1
    angleIndex = index

    if (!objectRef.current) return

    objectRef.current.position.set(buffers.positions[xIndex], buffers.positions[yIndex], objectRef.current.position.z)
    objectRef.current.rotation.set(objectRef.current.rotation.x, objectRef.current.rotation.y, buffers.angles[angleIndex])

}

const mapBufferDataToObjectRefZAxis = (buffers: PlanckjsBuffersData, index: number, objectRef: MutableRefObject<Object3D>) => {

    xIndex = index * 2
    yIndex = (index * 2) + 1
    angleIndex = index

    if (!objectRef.current) return

    objectRef.current.position.set(buffers.positions[xIndex], objectRef.current.position.y, buffers.positions[yIndex])
    objectRef.current.rotation.set(objectRef.current.rotation.x, objectRef.current.rotation.y, buffers.angles[angleIndex])

}

export const PlanckjsPhysicsConsumer: React.FC<{
    worker: Worker,
    maxNumberOfPhysicsObjects?: number,
    stepRate?: number,
    applyToZAxis?: boolean,
}> = ({maxNumberOfPhysicsObjects = DEFAULT_NUMBER_OF_PHYSICS_OBJECTS, applyToZAxis, ...props}) => {

    const [buffers] = useState(() => generatePlanckjsBuffers(maxNumberOfPhysicsObjects))
    return <PhysicsConsumer mapBufferDataToObjectRef={applyToZAxis ? mapBufferDataToObjectRefZAxis : mapBufferDataToObjectRef} buffers={buffers} {...props}/>

}
