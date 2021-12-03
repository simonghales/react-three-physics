export const createNewPhysicsLoopWebWorker = (stepRate: number) => {
    return new Worker('data:application/javascript,' +
        encodeURIComponent(`
            
            var start = performance.now();
            var updateRate = ${stepRate};
            var maxAccumulator = updateRate;
            
            function getNow() {
                return start + performance.now();
            }
            
            var accumulator = 0;
            var lastAccumulation = getNow();
            var now = getNow();
            var numberOfUpdates = 0;
            var timeout;
            var secondTimeout;
            var lastStep = 0;
            var timeSinceLastStep = 0;
            
            self.addEventListener("message", function(event) {
                if (event.data !== "FRAME") {
                    return;
                }
                if (timeout) {
                    clearTimeout(timeout);
                }
                accumulator = 0;
                now = getNow();
                lastFrame = now;
                lastAccumulation = now;
                timeSinceLastStep = now - lastStep;
                // if (timeSinceLastStep >= updateRate - 2) {
                //     lastAccumulation = now;
                //     sendStep();
                // }
                timeout = setTimeout(step, updateRate - 1);
            });
            
            function sendStep() {
                self.postMessage('step');
                lastStep = getNow();
                accumulator -= maxAccumulator;
            }
            
            function accumulate() {
                now = getNow();
                accumulator += now - lastAccumulation;
                lastAccumulation = now;
                while (accumulator <= maxAccumulator) {
                    now = getNow();
                    accumulator += now - lastAccumulation;
                    lastAccumulation = now;
                }
                numberOfUpdates = Math.floor(accumulator / maxAccumulator);
                for (var i = 0; i < numberOfUpdates; i++) {
                    sendStep();
                }
            }
        
            function step() {
                
                accumulate();
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(step, updateRate - 2 - accumulator);
                
            }
            
            step()
            
        `) );
}
