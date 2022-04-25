import { World } from "cannon-es";
import React, {useCallback} from "react";
import {PhysicsProvider} from "../PhysicsProvider";
import {
    convertCannonBodyDataToBufferData,
    copyCannonBodyData,
    generateCannonBuffers,
    getCannonBodyData
} from "./buffers";

const defaultStepWorld = (world: World, delta: number) => {
    world.fixedStep()
}

export const CannonPhysicsProvider: React.FC<{
    worker: Worker,
    world: World,
    stepWorld?: (world: World, delta: number) => void,
    paused?: boolean,
    stepRate?: number,
    maxNumberOfPhysicsObjects?: number,
}> = ({children, worker, world, stepWorld: passedStepWorld, paused = false, stepRate, maxNumberOfPhysicsObjects, ...props}) => {

    const stepWorld = useCallback((delta: number) => {
        if (passedStepWorld) {
            passedStepWorld(world, delta)
        } else {
            defaultStepWorld(world, delta)
        }
    }, [world, passedStepWorld])

    return (
        <PhysicsProvider
            generateBuffers={generateCannonBuffers}
    convertBodyDataToBufferData={convertCannonBodyDataToBufferData}
    copyBodyData={copyCannonBodyData}
    getBodyData={getCannonBodyData}
    stepWorld={stepWorld}
    paused={paused} worker={worker} stepRate={stepRate} maxNumberOfPhysicsObjects={maxNumberOfPhysicsObjects} {...props}>
    {children}
    </PhysicsProvider>
)


}

