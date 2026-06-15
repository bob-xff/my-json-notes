// 引入 Node.js 内置的文件系统模块 (fs) 和路径模块 (path)
const fs = require('fs').promises; // 使用 .promises 版本，使其返回 Promise，方便用 async/await
const path = require('path'); // 用于处理文件路径

// 定义数据文件的完整路径，__dirname 是当前文件 (fsUtils.js) 所在的目录
const DATA_FILE = path.join(__dirname, 'data.json');

// 读取数据的函数
async function readData() {
    try {
        // 读取 data.json 文件的内容，编码为 UTF-8
        const data = await fs.readFile(DATA_FILE, 'utf8');
        // 将读取到的字符串解析为 JavaScript 对象
        return JSON.parse(data);
    } catch (error) {
        console.error('读取数据文件时出错:', error.message);
        // 如果文件不存在或内容不是有效 JSON，则返回一个默认的空结构
        return { notes: [] };
    }
}

// 写入数据的函数
async function writeData(data) {
    try {
        // 将 JavaScript 对象转换为格式化的 JSON 字符串 (带缩进，便于查看)
        const jsonString = JSON.stringify(data, null, 2);
        // 将 JSON 字符串写入 data.json 文件
        await fs.writeFile(DATA_FILE, jsonString, 'utf8');
    } catch (error) {
        console.error('写入数据文件时出错:', error.message);
        // 抛出错误，让调用此函数的地方知道写入失败了
        throw error;
    }
}

// 将这两个函数导出，以便在其他文件 (如 server.js) 中使用
module.exports = { readData, writeData };