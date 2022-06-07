import parser from '@babel/parser'
import traverse from '@babel/traverse'
import fs from 'fs'
import Path from 'path'
import ejs from 'ejs'
import {transformFromAst} from 'babel-core'
let id = 0;

function createAsset(filePath) {
    
    //获取源文件入口
    const source = fs.readFileSync(filePath, {
        encoding: 'utf-8'
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
    const {code} = transformFromAst(ast,null,{
        presets:['env']
    })
    //console.log(deps)

    return {
        // source,
        deps,
        filePath,
        code,
        mapping:{},
        id:id++
    }

}

function createGraph() {
    const mainAssets = createAsset('./example/main.js')

    const queue = [mainAssets]

    for (const assetsPath of queue) {
        assetsPath.deps.forEach(releasePath=> {
            const subAssets =  createAsset(Path.resolve('./example',releasePath))
            // console.log(subAssets)
            assetsPath.mapping[releasePath] = subAssets.id
            queue.push(subAssets)
        }) 
    }
    //console.log('queue',queue)
    return queue
}

const graph =  createGraph()
function build (graph) {
    const template = fs.readFileSync('./bundle.ejs',{encoding:'utf-8'})
    const data = graph.map(asstes => {
        return {
            filePath:asstes.filePath,
            code :asstes.code,
            id:asstes.id,
            mapping:asstes.mapping
        }
    })
    const bundle =  ejs.render(template,{data})
    console.log(data)
    fs.writeFileSync('./dist/bundle.js',bundle)
    
}

build(graph)