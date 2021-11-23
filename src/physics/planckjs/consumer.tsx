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
    objectRef.current.rotation.set(buffers.angles[angleIndex], objectRef.current.rotation.y, objectRef.current.rotation.z)

}

export const PlanckjsPhysicsConsumer: React.FC<{
    worker: Worker,
    maxNumberOfPhysicsObjects?: number,
    stepRate?: number,
}> = ({maxNumberOfPhysicsObjects = DEFAULT_NUMBER_OF_PHYSICS_OBJECTS, ...props}) => {

    const [buffers] = useState(() => generatePlanckjsBuffers(maxNumberOfPhysicsObjects))
    return <PhysicsConsumer mapBufferDataToObjectRef={mapBufferDataToObjectRef} buffers={buffers} {...props}/>

}
