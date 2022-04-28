function dedupeHooks(hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}

export function mergeWebHook(parentVal, childVal) {
  const res = childVal
    ? parentVal
      ? Array.isArray(parentVal)
        ? parentVal.concat(childVal)
        : [parentVal, childVal]
      : Array.isArray(childVal)
      ? childVal
      : [childVal]
    : parentVal
  return res ? dedupeHooks(res) : res
}

export const LIFECYCLES_HOOKS = [
  'beforeMount',
  'mounted',
  'updated',
  'destroyed'
]
