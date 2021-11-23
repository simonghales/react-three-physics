import React, {useEffect, useMemo, useRef} from "react"
import {createNewPhysicsLoopWebWorker} from "./physicsLoopWorker";
import {getNow} from "./utils/time";

let now = 0
let delta = 0

export const PhysicsStepper: React.FC<{
    paused: boolean,
    stepRate: number,
    stepWorld: (delta: number) => void,
    onWorldStep: (delta: number) => void,
    updateSubscriptions: (delta: number) => void,
}> = ({
          paused,
          stepRate,
          onWorldStep,
          stepWorld: passedStepWorld,
          updateSubscriptions,
      }) => {

    const localStateRef = useRef({
        lastUpdate: getNow(),
    })

    const {
        stepWorld,
    } = useMemo(() => ({
        stepWorld: () => {
            now = getNow()
            delta = now - localStateRef.current.lastUpdate
            localStateRef.current.lastUpdate = now
            if (paused) return
            passedStepWorld(delta)
            onWorldStep(delta)
            updateSubscriptions(delta)
        }
    }), [paused, onWorldStep, passedStepWorld])

    const stepWorldRef = useRef(stepWorld)

    useEffect(() => {
        stepWorldRef.current = stepWorld
    }, [stepWorld])

    useEffect(() => {

        if (paused) return

        let unmounted = false

        const worker = createNewPhysicsLoopWebWorker(stepRate)

        worker.onmessage = (event) => {
            if (event.data === 'step') {
                if (unmounted) {
                    console.warn('step called but worker should be unmounted')
                    return
                }
                stepWorldRef.current()
            }
        }

        return () => {
            unmounted = true
            worker.terminate()
        }

    }, [paused])

    return null
}
