export function getKeyByValue(object, value) {
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      for (var key2 in object[key]) {
        if (object[key].hasOwnProperty(key2)) {
          if (object[key][key2] == value) return key2;
        }
      }
    }
  }
}

export function biasedRandom(bias, degree) {
  console.log("calling " + bias + " with " + degree + " probablilty");
  if (!Array.isArray(bias)) {
    console.log("bias ", bias);
    let temp = bias;
    bias = [];
    bias.push(temp);
  }
  let rand = parseFloat(Math.random().toFixed(2));
  console.log("rand0 ", rand, " , ", (rand < degree / 100));
  if (rand < degree / 100) {
    rand = Math.floor(Math.random() * bias.length);
    console.log("rand1 ", rand);
    return bias[rand];
  } else {
    rand = Math.ceil(Math.random() * 6);
    console.log("rand2 ", rand);
    return rand;
  }
}
export class Sleep {
  promise: Promise<unknown>;
  promiseResolve: () => void;
  timeout: NodeJS.Timeout;
  constructor(duration) {
    this.promise = new Promise<void>((resolve) => {
      this.promiseResolve = resolve;
      this.timeout = setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  async wait() {
    return await this.promise;
  }

  cancel() {
    clearTimeout(this.timeout);
    this.promiseResolve();
  }
}
