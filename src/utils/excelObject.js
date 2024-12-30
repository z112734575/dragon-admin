const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs-extra');
const exportExcel = ({data, name, type, region}) => {
    const filePath = type === "custom" ? name : path.join('user_data',region, `${name}.xlsx`);
    if(!fs.existsSync(path.join('user_data',region))){
        fs.mkdirSync(path.join('user_data',region), { recursive: true });
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filePath);
    console.log("写入excel成功")
    return filePath
}

module.exports = exportExcel;