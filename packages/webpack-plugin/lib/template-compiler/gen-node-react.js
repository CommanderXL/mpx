const { dash2hump } = require('../utils/hump-dash')

function findPrevNode (node) {
  const parent = node.parent
  if (parent) {
    let index = parent.children.indexOf(node)
    while (index--) {
      const preNode = parent.children[index]
      if (preNode.type === 1) {
        return preNode
      }
    }
  }
}

function genIf (node) {
  node.ifProcessed = true
  return genIfConditions(el.ifConditions.slice())
}

function genIfConditions(conditions){
  if(!conditions.length) return 'null'
  const condition = conditions.shift()
  if(condition.exp) {
    return `(${condition.exp})?${genNode(condition.block)}:${genIfConditions(conditions)}`
  } else {
    return  genNode(condition.block)
  }
}

function genFor (node) {
  node.forProcessed = true
  const index = node.for.index || 'index'
  const item = node.for.item || 'item'
  return `_i(${node.for.exp}, function(${item},${index}){return ${genNode(node)}})`
}

const s = JSON.stringify

function mapAttrName (name) {
  if (name === 'class') return 'className'
  return dash2hump(name)
}

function genNode (node) {
  let exp = ''
  if (node) {
    if (node.type === 3) {
      if (!node.isComment) {
        if (node.exps) {
          exp += `${node.exps[0].exp}`
        } else {
          exp += `${s(node.text)}`
        }
      }
    }
    if (node.type === 1) {
      if (node.tag !== 'temp-node') {
        if (node.for && !node.forProcessed) {
          exp += genFor(node)
        } else if (node.if && !node.ifProcessed) {
          exp += genIf(node)
        } else if (node.elseif && !node.elseifProcessed) {
          exp += genElseif(node)
        } else if (node.else && !node.elseProcessed) {
          exp += genElse(node)
        } else {
          exp += `createElement(${node.isComponent ? `components[${s(node.tag)}]` : s(node.tag)}`
          if (node.attrsList.length) {
            exp += ',{'
            const attrExpMap = (node.exps || []).reduce((map, { exp, attrName }) => {
              if (attrName) {
                map[attrName] = exp
              }
              return map
            }, {})
            node.attrsList.forEach(({ name, value }, index) => {
              exp += `${index === 0 ? '' : ','}${mapAttrName(name)}:`
              exp += attrExpMap[name] ? attrExpMap[name] : s(value)
            })
            exp += '}'
          } else {
            exp += ',null'
          }

          if (!node.unary && node.children.length) {
            exp+=','
            node.children.forEach(function (child, index) {
              exp += `${index === 0 ? '' : ','}${genNode(child)}`
            })
          }
          exp += ')'
        }
      } else {
        node.children.forEach(function (child, index) {
          exp += `${index === 0 ? '' : ','}${genNode(child)}`
        })
      }
    }
  }
  return exp
}

module.exports = genNode

