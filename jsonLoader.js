/**
 * 处理非js的文件
 * @param {*} source 
 * @returns 
 */
export function jsonLoader(source) {
    return `export default  ${JSON.stringify(source)}`
}