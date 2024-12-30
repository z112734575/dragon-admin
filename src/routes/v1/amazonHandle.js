const Router = require('koa-router');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const excelData = require('../../utils/excelData.js');
const excelObject = require('../../utils/excelObject.js');
const router = new Router();

router.post('/amazon/fetch-info', async (ctx) => {
  console.log(ctx.request.body, "ctx.request.body")
  const { region, fileName } = ctx.request.body;
  console.log(region, "region")
  console.log(fileName, "fileName")
  try {
    // 读取 Excel 文件
    const filePath = `uploads/excel/${region}/${fileName}`
    if (!fs.existsSync(filePath)) {
      ctx.status = 400;
      ctx.body = { message: '文件不存在' };
      return;
    }
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);


    // 处理数据
    // 这里可以根据需要处理数据，例如保存到数据库
    console.log(data);
    const result = await excelData({dataset: data, name: fileName, type: "custom", region, handleType: "price"})
    console.log(result, "resul==========")
    // ctx.body = { message: '处理成功', data };

     // 创建新的 Excel 文件
    //  const newWorkbook = xlsx.utils.book_new();
    //  const newWorksheet = xlsx.utils.json_to_sheet(data);
    //  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'ProcessedData');
    returnData({ctx, result, fileName, region})


  } catch (error) {
    console.error('处理失败:', error);
    ctx.status = 500;
    ctx.body = { message: '处理失败', error: error.message };
  }
});

function returnData({ctx, result, fileName, region}) {
        //  // 将新文件写入临时目录
     const newFileName = `processed_${fileName}`;
     const filePath = excelObject({data:result, name: newFileName, region});
      console.log(filePath, "newFilePath")
     // 设置响应头并发送文件
     ctx.set('Content-disposition', `attachment; filename=${newFileName}`);
     ctx.set('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     ctx.body = fs.createReadStream(filePath);
}

module.exports = router; 