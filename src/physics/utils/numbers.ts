import { lerp } from "three/src/math/MathUtils"

export {
    lerp,
}

export const lerpRadians = (A: number, B: number, w: number) => {
    let CS = (1-w)*Math.cos(A) + w*Math.cos(B);
    let SN = (1-w)*Math.sin(A) + w*Math.sin(B);
    return Math.atan2(SN,CS);
}
