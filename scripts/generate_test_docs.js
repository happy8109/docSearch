const fs = require('fs');
const path = require('path');
const officegen = require('officegen');
const config = require('../config');

const dataDir = config.docDirectory;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sampleDocs = [
  {
    filename: '2025年第三季度项目进展报告.docx',
    title: '智慧城市公共交通云监控项目 - 2025年Q3进展报告',
    paragraphs: [
      '本报告记录了在2025年第三季度，针对城市公共交通云计算监控网络的铺设进度及核心技术瓶颈解决情况。',
      '经过长达两个月的集中攻坚，项目组完成了位于市中心以及周边三个卫星城的监控硬件节点的部署工作，其中采用了最新的微型摄像头与边缘推流设备，总成本降低了近20%。',
      '在后端服务器架构方面，我们正式采用了 Node.js 配合高性能的全文检索库搭建了车辆日志追踪的搜索平台。本季度内的车辆历史轨迹查询延迟已经从原来的 500ms 降低到了 80ms 左右。'
    ]
  },
  {
    filename: '保密管理制度与规范_内部审阅版.docx',
    title: '信息系统保密管理指引 (V2.1版)',
    paragraphs: [
      '为进一步加强各单位网络安全和保密工作，防止重要核心数据、涉密文档遭非法窃取与篡改，特制定本管理制度准则。',
      '所有涉及公司财务、高管人事架构及重大项目竞标方案的相关会议纪要，归档时必须采用高强度加密机制存储于离线专有服务器内。',
      '员工在使用局域网文档搜索引擎检索资料时，系统将会自动开启日志审计模块（如接入了 morgan 等），以便事后溯源每一次敏感关键词的查询操作来源。'
    ]
  },
  {
    filename: '人事变动通知书_2026_03_13.docx',
    title: '关于工程运维部部分岗位的调整通报',
    paragraphs: [
      '按照本年度整体部门规划要求，经公司高层研究决定：',
      '原前端开发组组长李明同志，在公司基础架构建设中表现优异，尤其是在主导推行新的 Google 风格检索中台 UI 设计上贡献突出，即日起晋升为研发中心副总监。',
      '系统运维岗目前正在大规模补充全栈人才，重点引进熟悉环境搭建、网络安全审计以及擅长搭建和维护 Node.js 引擎环境的应届本科毕业生。'
    ]
  }
];

function createDoc(docData) {
  return new Promise((resolve, reject) => {
    const docx = officegen('docx');

    docx.on('error', function (err) {
      console.error(err);
      reject(err);
    });

    const pObjTitle = docx.createP();
    pObjTitle.addText(docData.title, { bold: true, font_size: 18 });
    pObjTitle.options.align = 'center';

    docData.paragraphs.forEach(text => {
      const pObj = docx.createP();
      pObj.addText(text, { font_size: 12 });
    });

    const filePath = path.join(dataDir, docData.filename);
    const out = fs.createWriteStream(filePath);
    
    out.on('error', function (err) {
      console.error(err);
      reject(err);
    });

    out.on('close', function() {
      console.log(`Successfully created test document: ${filePath}`);
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
}

run();
