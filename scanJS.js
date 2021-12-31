const date = require('date-and-time');
const fs = require('fs');
const path = require('path');
const isMinified = require('is-minified-code');

const sourceCatalog = './source';
const resultCatalog = './result';
const scanType = process.argv.slice(2)[0];

/** 
 * 扫描 js 代码文件是否混淆
 * @param projectName 项目名
 * @param list 文件列表
 */
const scanJSMinified = (projectName, list) => {
  const jsFileList = list.filter((item) => item.name.endsWith('.js')); // 过滤非 js 文件
  const unminified = [];
  let resultStr = '';

  jsFileList.forEach(({ path: _path, name }, i) => {

    // 读取文件内容
    fs.readFile(_path, (err, data) => {
      if (err) {
        throw err;
      }

      // 判断是否混淆
      const minified = isMinified(data.toString());
      resultStr += `文件名：${name}; 代码是否混淆：${minified} \n`;
      if (!minified) {
        unminified.push(name);
      }

      if (i === jsFileList.length - 1) {
        fs.mkdir(resultCatalog, { recursive: true }, (err) => {
          if (err) {
            throw err;
          }

          // 输出扫描结果
          const scanResult = `没有混淆的文件数：${unminified.length}个\n\n====== 详情如下 ======\n${resultStr}`;
          const resultFileName = `${projectName || 'scan'}-${date.format(new Date(), 'YYYYMMDDHHmmss')}.mf.txt`;
          fs.writeFile(path.join(resultCatalog, resultFileName), scanResult, (err) => {
            if (err) {
              throw err;
            }

            console.log(`\x1B[36m[minified]\x1B[0m ${projectName} 项目扫描完成！(结果：\x1B[1m${resultFileName})\x1B[0m`);
          });
        });
      }
    });
  })
}

/**
 * 扫描目录是否包含管理的 sourcemap 文件
 * @param {string} projectName 项目名 
 * @param {Array} list 文件列表
 */
const scanJSSourcemap = (projectName, list) => {
  const jsFileList = list.filter((item) => item.name.endsWith('.js')); // 过滤非 js 文件
  const jsSourcemapList = list.filter((item) => item.name.endsWith('.map')); // 过滤非 .map 文件
  const sourcemap = [];
  let resultStr = '';

  jsFileList.forEach(({ path: _path, name }, i) => {
    // 读取文件内容
    fs.readFile(_path, (err, data) => {
      if (err) {
        throw err;
      }

      // 参考：https://segmentfault.com/a/1190000038467293
      const dataStr = data.toString();
      const reg = /(?<=sourceMappingURL=).*?\.map/; // 匹配文件中 sourcemap 的标识
      const matchResult = dataStr.match(reg);
      let includeSourcemap = false;

      if (matchResult && matchResult.length) {
        const sourcemapFileName = matchResult[0];
        // 判断目录中是否存在满足 sourcemap 标识的文件
        includeSourcemap = jsSourcemapList.some(({ name: _sourcemapFileName }) => _sourcemapFileName === sourcemapFileName);
      }

      if (includeSourcemap) {
        sourcemap.push(name);
      }
      resultStr += `文件名：${name}; 是否包含 sourcemap：${includeSourcemap} \n`;

      if (i === jsFileList.length - 1) {
        fs.mkdir(resultCatalog, { recursive: true }, (err) => {
          if (err) {
            throw err;
          }

          // 输出扫描结果
          const scanResult = `包含 sourcemap的文件数：${sourcemap.length}个\n\n====== 详情如下 ======\n${resultStr}`;
          const resultFileName = `${projectName || 'scan'}-${date.format(new Date(), 'YYYYMMDDHHmmss')}.sm.txt`;
          fs.writeFile(path.join(resultCatalog, resultFileName), scanResult, (err) => {
            if (err) {
              throw err;
            }
            console.log(`\x1B[33m[sourcemap]\x1B[0m ${projectName} 项目扫描完成！(结果：\x1B[1m${resultFileName})\x1B[0m`);
          });
        });
      }
    });
  });
}

// const logScanResult = (type, )

/**
 * 扫描项目目录的文件
 * @param {string} filedir 扫描目录
 */
const scanCatalogFile = (filedir) => {
  let result = [];

  // 扫描目录
  try {
    const files = fs.readdirSync(filedir);

    // 遍历文件
    files.forEach((file) => {
      const filedir1 = path.join(filedir, file);
      if (fs.statSync(filedir1).isDirectory()) {
        // 如果是目录，递归扫描
        try {
          const _list = scanCatalogFile(filedir1);
          result = [...result, ..._list]
        } catch (err) {
          result = [...result];
        }
      } else {
        result.push({ path: filedir1, name: file })
      }
    });
  } catch (err) {
    result = [];
  }
  return result;
}

// 读取文件目录
fs.readdir(sourceCatalog, (err, files) => {
  if (err) {
    throw err;
  }

  // 第一层需要是项目的文件夹，即目录结构：source/xxx-project ; 过滤非目录
  const directories = files.filter((directory) => {
    try {
      return fs.statSync(path.join(sourceCatalog, directory)).isDirectory();
    } catch {
      return false;
    }
  });

  directories.forEach((directory) => {
    try {
      const filedir = path.join(sourceCatalog, directory);
      const res = scanCatalogFile(filedir);

      if (scanType === 'mf' || !scanType) {
        scanJSMinified(directory, res);
      }

      if (scanType === 'sm' || !scanType) {
        scanJSSourcemap(directory, res);
      }
    } catch (err) {
      console.error(err);
    }
  });
});
