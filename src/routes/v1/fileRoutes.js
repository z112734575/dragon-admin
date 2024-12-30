const Router = require('koa-router');
const multer = require('@koa/multer');
const xlsx = require('xlsx');
const fs = require('fs');
const dayjs = require('dayjs');



const router = new Router();
const upload = multer({ dest: 'uploads/excel' }); // 设置上传文件的临时存储目录

router.post('/file/upload-excel', upload.single('file'), async (ctx) => {

    const { region, fileName } = ctx.request.body;
    console.log(region, "region")
    console.log(fileName, "fileName")
  try {
    const file = ctx.file;
    if (!file) {
      ctx.status = 400;
      ctx.body = { message: '文件上传失败' };
      return;
    }
    console.log(file, "file")
    const filePath = `uploads/excel/${region}`
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true })
    }
    const time = dayjs().format('YYYY_MM_DD_HH_mm_ss')
    fs.renameSync(file.path, `${filePath}/${fileName}_${time}.xlsx`)
    // 读取 Excel 文件
    const workbook = xlsx.readFile(`${filePath}/${fileName}_${time}.xlsx`);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // 删除临时文件
    // fs.unlinkSync(file.path);

    // 处理数据
    // 这里可以根据需要处理数据，例如保存到数据库
    console.log(data);

    ctx.body = { message: '文件处理成功', data:{
        region,
        fileName: `${fileName}_${time}.xlsx`,
        time
    } };
  } catch (error) {
    console.error('文件处理失败:', error);
    ctx.status = 500;
    ctx.body = { message: '文件处理失败', error: error.message };
  }
});

module.exports = router; 