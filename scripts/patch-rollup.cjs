const fs = require('fs')
const path = require('path')

const rollupNative = path.join(__dirname, '..', 'node_modules', 'rollup', 'dist', 'native.js')

if (fs.existsSync(rollupNative)) {
  try {
    let content = fs.readFileSync(rollupNative, 'utf8')
    if (!content.includes('@rollup/wasm-node')) {
      content = content.replace(
        'return require(id);',
        "return require(id);\n\t} catch (err) {\n\t\ttry { return require('@rollup/wasm-node/dist/native.js'); } catch {}"
      )
      fs.writeFileSync(rollupNative, content, 'utf8')
    }
  } catch {
    // ignore
  }
}
