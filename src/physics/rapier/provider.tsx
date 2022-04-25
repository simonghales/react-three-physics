import { World } from "@dimforge/rapier3d-compat";
import React, {useCallback} from "react";
import {PhysicsProvider} from "../PhysicsProvider";
import {
    convertRapierBodyDataToBufferData,
    copyRapierBodyData,
    generateRapierBuffers,
    getRapierBodyData
} from "./buffers";

const defaultStepWorld = (world: World, delta: number) => {
    world.step()
}

export const RapierPhysicsProvider: React.FC<{
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
            generateBuffers={generateRapierBuffers}
            convertBodyDataToBufferData={convertRapierBodyDataToBufferData}
            copyBodyData={copyRapierBodyData}
            getBodyData={getRapierBodyData}
            stepWorld={stepWorld}
            paused={paused} worker={worker} stepRate={stepRate} maxNumberOfPhysicsObjects={maxNumberOfPhysicsObjects} {...props}>
            {children}
        </PhysicsProvider>
    )


}
