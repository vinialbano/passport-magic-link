module.exports = (obj, field) => {
  if (!obj) {
    return undefined
  }
  const chain = field
    .split(']')
    .join('')
    .split('[')
  for (let i = 0, len = chain.length; i < len; i++) {
    const prop = obj[chain[i]]
    if (typeof prop === 'undefined') {
      return undefined
    }
    if (typeof prop !== 'object' || i === len - 1) {
      return prop
    }
    obj = prop
  }
  return undefined
}
