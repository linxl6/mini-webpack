export class ChangeOutputPathPlugin {
    apply(hooks) {
        hooks.emitFile.tap('changeOutputPath', function (context) {
            console.log('----------changeOutputPath---------------')
            context.changeOutputPath('./dist/cxr.js')
        })
    }
}