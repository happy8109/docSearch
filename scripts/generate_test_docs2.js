const fs = require('fs');
const path = require('path');
const officegen = require('officegen');

// 直接写入第二个测试目录
const dataDir = path.resolve(__dirname, '../../data2');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sampleDocs = [
  {
    filename: '年终财务审计报告_2025.docx',
    title: '2025年度集团财务内部审计报告',
    paragraphs: [
      '本报告系集团审计部依据《企业内部控制基本规范》和《审计院建议指南》，对2025年度各下属单位财务状况进行系统性审查后出具。',
      '审计发现：部分子公司在固定资产折旧计提方面存在不一致性，尤其是在信息化设备（如服务器、交换机等）的加速折旧年限认定上，各单位缺乏统一标准。',
      '建议总部财务部牵头制定统一折旧政策模板，并在年度预算编制前下发至各单位执行，以确保合并报表准确性。'
    ]
  },
  {
    filename: '网络安全应急预案_V3.docx',
    title: '局域网网络安全事件应急响应预案 (第三版)',
    paragraphs: [
      '为有效应对各类网络安全威胁及突发事件，保障局域网环境下各业务系统的连续性与数据完整性，特修订本应急预案。',
      '常见安全事件包括但不限于：勒索软件攻击、内网横向渗透、DNS劫持、DDoS流量攻击以及涉密文件外泄等。',
      '应急响应流程分为五个阶段：事件检测与报告、初步评估与分级、应急处置与隔离、溯源分析与修复、总结复盘与改进。各阶段均需在事件发生后的1小时内启动。'
    ]
  },
  {
    filename: '新员工培训计划_2026春季.docx',
    title: '2026年春季新入职员工集中培训实施方案',
    paragraphs: [
      '根据人力资源部年度培训计划安排，2026年春季批次共计划接收新入职员工42人，涵盖技术研发、市场营销和行政管理三大方向。',
      '培训内容包括：公司文化与制度宣贯（2天）、岗位技能实操训练（5天）、信息化办公系统使用培训（1天），其中信息化培训环节将重点介绍内部文档搜索引擎的使用方法。',
      '培训结束后将安排统一考核，考核通过者正式分配至用人部门，未通过者将安排二次强化培训。'
    ]
  }
];

function createDoc(docData) {
  return new Promise((resolve, reject) => {
    const docx = officegen('docx');
    docx.on('error', (err) => reject(err));

    const pObjTitle = docx.createP();
    pObjTitle.addText(docData.title, { bold: true, font_size: 18 });
    pObjTitle.options.align = 'center';

    docData.paragraphs.forEach(text => {
      const pObj = docx.createP();
      pObj.addText(text, { font_size: 12 });
    });

    const filePath = path.join(dataDir, docData.filename);
    const out = fs.createWriteStream(filePath);
    out.on('error', (err) => reject(err));
    out.on('close', () => {
      console.log(`Created: ${filePath}`);
      resolve(filePath);
    });
    docx.generate(out);
  });
}

async function run() {
  console.log(`Generating test documents in ${dataDir} ...`);
  for (const doc of sampleDocs) {
    await createDoc(doc);
  }
  console.log('Done!');
}

run();
