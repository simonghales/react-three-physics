import React, {useEffect, useMemo, useRef} from "react"
import {createNewPhysicsLoopWebWorker} from "./physicsLoopWorker";
import {getNow} from "./utils/time";

let now = 0
let timePassed = 0
let delta = 0

export const PhysicsStepper: React.FC<{
    manualSteps: boolean,
    setOnFrameCallback: any,
    paused: boolean,
    stepRate: number,
    stepWorld: (delta: number) => void,
    onWorldStep: (delta: number) => void,
    updateSubscriptions: (delta: number) => void,
    updateBeforeStepSubscriptions: (delta: number) => void,
}> = ({
           setOnFrameCallback,
          paused,
          stepRate,
          onWorldStep,
          stepWorld: passedStepWorld,
          updateSubscriptions,
           updateBeforeStepSubscriptions,
                                       manualSteps,
      }) => {

    const localStateRef = useRef({
        lastUpdate: getNow(),
    })

    const {
        stepWorld,
    } = useMemo(() => ({
        stepWorld: () => {
            now = getNow()
            timePassed = now - localStateRef.current.lastUpdate
            if (timePassed <= 3) return
            delta = timePassed / stepRate
            localStateRef.current.lastUpdate = now
            if (paused) return
            updateBeforeStepSubscriptions(delta)
            passedStepWorld(timePassed)
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

        if (manualSteps) {
            setOnFrameCallback(() => {
                stepWorldRef.current()
            })
            return
        }

        let unmounted = false

        let worker: any;

        const createWorker = () => {
            worker = createNewPhysicsLoopWebWorker(stepRate)
            worker.onmessage = (event: any) => {
                if (event.data === 'step') {
                    if (unmounted) {
                        console.warn('step called but worker should be unmounted')
                        return
                    }
                    stepWorldRef.current()
                }
            }
        }



        setOnFrameCallback(() => {
            if (worker) {
                worker.postMessage("FRAME")
                stepWorldRef.current()
            } else {
                createWorker()
                worker.postMessage("FRAME")
            }
        })

        return () => {
            unmounted = true
            if (worker) {
                worker.terminate()
            }
        }

    }, [paused, manualSteps])

    return null
}
