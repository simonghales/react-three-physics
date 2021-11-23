import { Body, Vec2 } from "planck";
import {lerp, lerpRadians} from "../utils/numbers";

export type PlanckjsBuffersData = {
    positions: Float32Array,
    angles: Float32Array,
}

export const generatePlanckjsBuffers = (maxNumberOfPhysicsObjects: number): PlanckjsBuffersData => {
    return {
        positions: new Float32Array(maxNumberOfPhysicsObjects * 2),
        angles: new Float32Array(maxNumberOfPhysicsObjects * 1),
    };
}

export type PlanckjsBodyData = {
    position: Vec2,
    angle: number,
}

export const copyPlanckjsBodyData = (bodyData: PlanckjsBodyData, targetBodyData?: PlanckjsBodyData): PlanckjsBodyData => {
    if (!targetBodyData) {
        return {
            position: bodyData.position.clone(),
            angle: bodyData.angle,
        }
    }
    targetBodyData.position.set(bodyData.position)
    targetBodyData.angle = bodyData.angle
    return targetBodyData
}

export const getPlanckjsBodyData = (body: Body, targetBodyData?: PlanckjsBodyData): PlanckjsBodyData => {
    if (!targetBodyData) {
        return {
            position: body.getPosition(),
            angle: body.getAngle(),
        }
    }
    targetBodyData.position.set(body.getPosition())
    targetBodyData.angle = body.getAngle()
    return targetBodyData
}

let xPos: number = 0
let yPos: number = 0
let angle: number = 0

let xIndex: number = 0
let yIndex: number = 0
let angleIndex: number = 0

export const convertPlanckjsBodyDataToBufferData = (prevBodyData: PlanckjsBodyData | undefined, currentBodyData: PlanckjsBodyData | undefined, buffers: PlanckjsBuffersData, bodyIndex: number, progress: number) => {

    if (!currentBodyData) return

    xPos = currentBodyData.position.x
    yPos = currentBodyData.position.y
    angle = currentBodyData.angle

    xIndex = bodyIndex * 2
    yIndex = (bodyIndex * 2) + 1
    angleIndex = bodyIndex

    if (prevBodyData) {
        xPos = lerp(prevBodyData.position.x, currentBodyData.position.x, progress)
        yPos = lerp(prevBodyData.position.y, currentBodyData.position.y, progress)
        angle = lerpRadians(prevBodyData.angle, currentBodyData.angle, progress)
    }

    buffers.positions[xIndex] = xPos
    buffers.positions[yIndex] = yPos
    buffers.angles[angleIndex] = angle

}
