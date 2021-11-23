import React, {useCallback} from "react";
import {PhysicsProvider} from "../PhysicsProvider";
import {
    convertPlanckjsBodyDataToBufferData,
    copyPlanckjsBodyData,
    generatePlanckjsBuffers,
    getPlanckjsBodyData
} from "./buffers";
import {World} from "planck";
import {BodiesProvider} from "./bodies";

const defaultStepWorld = (world: World, delta: number) => {
    world.step(delta / 1000)
    world.clearForces()
}

export const PlanckjsPhysicsProvider: React.FC<{
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
            generateBuffers={generatePlanckjsBuffers}
            convertBodyDataToBufferData={convertPlanckjsBodyDataToBufferData}
            copyBodyData={copyPlanckjsBodyData}
            getBodyData={getPlanckjsBodyData}
            stepWorld={stepWorld}
            paused={paused} worker={worker} stepRate={stepRate} maxNumberOfPhysicsObjects={maxNumberOfPhysicsObjects} {...props}>
            <BodiesProvider world={world}>
                {children}
            </BodiesProvider>
        </PhysicsProvider>
    )
}
