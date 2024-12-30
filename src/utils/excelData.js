const XLSX = require('xlsx');
// const fieldReader = require('./excelToJson.js');
const concurrentRequest = require('./batchFetch.js');
const fetchAmazonInfo = require('./fetchAmazonInfo.js');
const exportExcel = require('./excelObject.js');
const fs = require('fs-extra');
const dayjs = require('dayjs');
// const minimist = require('minimist');
const path = require('path');





async function batchAddProduct({ dataset, region, handleType = 'price', name }) {
    console.log("国家是：" + region, "类型是：" + handleType);
    const time = dayjs().format('YYYY-MM-DD_HH_mm_ss');
    const result = await concurrentRequest({
        dataset: dataset,
        fetch: fetchAmazonInfo,
        maxConcurrency: 3,
        region,
        handleType
    }).catch((err) => {
        console.log(err, "并发请求错误")
    });

    const currentResult = result.success.map((item, index) => {
        const obj = {};
        obj['sku'] = item?.sku || '';
        obj['asin'] = item?.asin || '';
        obj['url'] = item?.link || '';
        obj['title'] = item?.title || '';
        obj['sub_title'] = item?.sub_title || '';
        obj['compare_at_price'] = item?.compare_at_price || '';
        obj['price'] = item?.price || '';
        obj['折扣'] = item?.volume || '';
        obj['会员价'] = item?.primePrice || '';
        obj['失败原因'] = item?.error || '';
        if (handleType !== 'price') {
            obj['body_html'] = item?.body_html || '';
            obj['images'] = item?.images?.length ? item?.images.join(',') : '';
            obj['specs'] = item?.specs || '';
            obj['short_description'] = item?.short_description || '';
            obj['tag'] = item?.tag || '';
            obj['product_type'] = item?.product_type || '';
        }
        return obj;
    });
    console.log(`result`, currentResult?.length)
    console.log("失败 sku：", currentResult?.map(item => { if (!!item.失败原因) { return item.sku } }).filter(Boolean))
    console.log("无价格 sku：", currentResult?.map(item => { if (item.price === "-") { return item.sku } }).filter(Boolean))
    if (handleType !== 'price') {
        console.log("无内容 sku：", currentResult?.map(item => { if (item.body_html.length < 800) { return item.sku } }).filter(Boolean))
    }
    return currentResult
    //   const filePath = path.join('json', region, `${region}_result_${time}.json`);
    //   fs.outputFile(filePath, JSON.stringify(currentResult)).then(() => {
    //     console.log('json文件写入成功')
    //   }).catch(err => {
    //     console.log('json文件写入失败', err)
    //   })
    //   const filePath2 = path.join('json', region, `create/create.json`);
    //   fs.outputFile(filePath2, JSON.stringify(currentResult)).then(() => {
    //     console.log('json create 文件写入成功')
    //   }).catch(err => {
    //     console.log('json create 文件写入失败', err)
    //   })
    //   const excelPath = path.join('excel', region, `${region}_result_` + time + '.xlsx');
    //   await createPathFile(path.join('excel', region));
    // exportExcel({data: currentResult, name: name});
}

async function createPathFile(dirPath) {
    if (fs.existsSync(dirPath)) {
        console.log('Directory exists!');
    } else {
        fs.mkdirs(dirPath);
    }
    return Promise.resolve();

}


module.exports = batchAddProduct;