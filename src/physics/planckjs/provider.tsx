import React, {useCallback} from "react";
import {PhysicsProvider} from "../PhysicsProvider";
import {
    convertPlanckjsBodyDataToBufferData, convertPlanckjsBodyDataToBufferDataNoLerp,
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
    lerpUpdates?: boolean,
    manualSteps?: boolean,
}> = ({children, worker, world, stepWorld: passedStepWorld, paused = false, stepRate, lerpUpdates = true, maxNumberOfPhysicsObjects, manualSteps = false, ...props}) => {

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
            convertBodyDataToBufferData={lerpUpdates ? convertPlanckjsBodyDataToBufferData : convertPlanckjsBodyDataToBufferDataNoLerp}
            copyBodyData={copyPlanckjsBodyData}
            getBodyData={getPlanckjsBodyData}
            stepWorld={stepWorld}
            manualSteps={manualSteps}
            paused={paused} worker={worker} stepRate={stepRate} maxNumberOfPhysicsObjects={maxNumberOfPhysicsObjects} {...props}>
            <BodiesProvider world={world}>
                {children}
            </BodiesProvider>
        </PhysicsProvider>
    )
}
