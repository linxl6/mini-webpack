import parser from '@babel/parser'
import traverse from '@babel/traverse'
import { transformFromAst } from 'babel-core'
import ejs from 'ejs'
import fs from 'fs'
import Path from 'path'
import { SyncHook } from 'tapable'
import { ChangeOutputPathPlugin } from './ChangeOutputPathPlugin.js'
import { jsonLoader } from './jsonLoader.js'
let id = 0;
const webpackConfig = {
    plugins: [
        new ChangeOutputPathPlugin()
    ],
    module: {
        rules: [
            {
                test: /\.json$/,
                use: jsonLoader
            }
        ]
    }
}

const hooks = {
    emitFile: new SyncHook(['context'])
}

function createAsset(filePath) {

    //获取源文件入口
    let source = fs.readFileSync(filePath, {
        encoding: 'utf-8'
    })
    const loaders = webpackConfig.module.rules
    loaders.forEach(({ test, use }) => {
        if (test.test(filePath)) {
            source = use(source)
        }
    })
    //读取ast格式
    const ast = parser.parse(source, {
        sourceType: 'module'
    })
    //格式化ast读取信息
    const deps = [];

    traverse.default(ast, {
        ImportDeclaration({ node }) {
            deps.push(node.source.value)
        }
    })
    const { code } = transformFromAst(ast, null, {
        presets: ['env']
    })
    //console.log(deps)

    return {
        // source,
        deps,
        filePath,
        code,
        mapping: {},
        id: id++
    }

}

function initPlugins() {
    const plugins = webpackConfig.plugins;
    plugins.forEach(plugin => {
        plugin.apply(hooks)
    })
}

function createGraph() {
    const mainAssets = createAsset('./example/main.js')

    const queue = [mainAssets]

    for (const assetsPath of queue) {
        assetsPath.deps.forEach(releasePath => {
            const subAssets = createAsset(Path.resolve('./example', releasePath))
            // console.log(subAssets)
            assetsPath.mapping[releasePath] = subAssets.id
            queue.push(subAssets)
        })
    }
    //console.log('queue',queue)
    return queue
}
initPlugins()
const graph = createGraph()
function build(graph) {
    const template = fs.readFileSync('./bundle.ejs', { encoding: 'utf-8' })
    const data = graph.map(asstes => {
        return {
            filePath: asstes.filePath,
            code: asstes.code,
            id: asstes.id,
            mapping: asstes.mapping
        }
    })
    const bundle = ejs.render(template, { data })
    // console.log(data)
    let outputPath = './dist/bundle.js'
    const context = {
        changeOutputPath(path) {
            outputPath = path
        }
    }
    hooks.emitFile.call(context)
    fs.writeFileSync(outputPath, bundle)

}

build(graph)