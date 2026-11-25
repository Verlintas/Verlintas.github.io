# 09. 调研方法、证据分级与局限

> 本文件说明资料是怎么收集、如何核对、哪些地方不确定。  
> 目的：让读者能判断每一条信息的可信度，而不是只看结论。

---

## 1. 调研范围

- **产品**：富士制药 プロギノン・デポー筋注10mg（productdetail/176）
- **主题**：
  1. 产品身份、组成、批准、药价、供应；
  2. MtF GAHT 中的使用（日本指南、国际指南、实际处方）；
  3. 药代动力学与临床文献；
  4. 安全性与监测；
  5. 保险、法律、费用、获取；
  6. 社区/患者向信息（仅作背景）。
- **时间**：2026-11-26（检索/访问日）；部分资料日期为 2024–2026。

---

## 2. 检索来源（按可信度）

### A. 官方/监管

- 富士制药产品页、添付文書 PDF、Interview Form PDF；
- PMDA 医疗用医药品情报、电子添附文书、改订指示、DSU；
- 厚生劳动省供应状况报告、药价、中医协资料；
- 总务省信息公开审查会答申（2026-06-19）；
- 厚生劳动省保险局疑义解釈（2018-03-30）。

### B. 学会指南

- 日本精神神经学会/日本GI学会《性別不合に関する診断と治療のガイドライン（第5版/一部再補正）》；
- WPATH SOC8（2022）；
- Endocrine Society 2017；
- AusPATH 2025、Sherbourne 第4版/2026修正、NHS NRGDS 2025、Endocrine Society of India 2025（作为对比）。

### C. 政府调查

- 厚生劳动省科研「性同一性障害（性別不合）に対するホルモン剤の使用実態及び臨床評価手法に関する研究」：
  - 令和5年度报告书（2024年5月）；
  - 令和5–7年度总合报告书（2025年6月）。

### D. 同行评议文献

- PubMed/Europe PMC 检索：EV PK、跨性别 GAHT、VTE、乳腺癌、prolactin、骨、日本研究；
- 经典 PK：Düsterberg 1982/1985、Schug 2012；
- 队列：Getahun 2018、Nota 2019、de Blok 2019、Nota 2017 等；
- 日本：Baba 2022、Kikuchi 2002、Uryu 2023、Mizukami 2021、Masumori 2023。

### E. 诊所/患者向

- 日本诊所网页（自由が丘MC、渋谷プライマリケア、宮川、W CLINIC、清美会、東京GC 等）；
- MtF wiki / tfsci；
- Reddit（r/TransDIY、r/asktransgender、r/AskMtFHRT、r/MtFHRT_MonoTherapy 等）；
- 日本个人博客、X/Twitter、中文社区（知乎/Bilibili 搜索摘要）。

### F. 灰色市场

- 仅用于记录“有人报告的价格/包装/假药风险”，不作为安全/疗效依据。

---

## 3. 多 subagent 分工

本项目使用了 5 个并行 subagent（各自有独立检索与会话）：

| Subagent | 任务 | 产出 |
|---|---|---|
| 1 | 国际指南（WPATH、Endocrine、AusPATH、Sherbourne、NHS、印度） | `research/01_international_gaht_guidelines.md`（997行） |
| 2 | 日本指南/法律/保险/诊所实践 | `research/02_japan_gaht_practice.md`（1014行） |
| 3 | EV 药代动力学/疗效/安全文献 | `research/03_estradiol_valerate_literature.md`（1009行，75篇文献） |
| 4 | 产品法规/安全/供应/海外/ペラニン | `research/04_product_regulatory_safety.md`（990行） |
| 5 | 社区/患者向信息/价格/供应 | `research/05_community_patient_info.md`（779行） |

主代理另外独立核对了：
- WPATH/Endocrine 的关键表格与目标值（`research/00_verified_guideline_excerpts.md`）；
- 日本指南表2、MHLW 调查、2026 答申、2018 問199、供应通知；
- 产品说明书/IF/PMDA 的关键段落。

> 这样做的目的：避免单一来源/单一模型的误差；关键数字至少有一次独立核对。

---

## 4. 证据分级（正文中的标记）

| 级别 | 含义 | 例子 |
|---|---|---|
| **【A 官方】** | 日本官方批准文件、PMDA、政府调查、学会指南 | 添付文書、IF、JSPN 指南、MHLW 报告、总务省答申 |
| **【B 同行评议】** | 原始研究、系统综述、荟萃分析 | Getahun 2018、Nota 2019、de Blok 2019、Schug 2012 |
| **【C 专业机构/诊所】** | 学会声明、诊所治疗说明、专家综述 | 诊所网页、医院告示、Masumori 2023 综述 |
| **【D 社区/个人】** | 患者 wiki、论坛、博客、社交媒体 | MtF wiki、Reddit、X、个人博客 |
| **【G 灰色市场】** | 非正规渠道 | 海淘 listing、假药报告 |

> 冲突时以更高级别、更近期的官方文件为准；社区信息只用于“有人怎么做/遇到什么问题”，不用于证明有效性/安全性。

---

## 5. 关键核对（示例）

- **产品身份**：官方产品页/添付文書/IF 三处一致：EV 10 mg/mL、芝麻油、10安瓿、IM only。
- **批准**：PMDA 电子添附文书显示 2025-10-22 改订第2版、承认番号 22000AMX00547（简写）；IF 显示完整 22000AMX005470 00。
- **药价**：官方产品页 306.00 日元/管；与 2026-04-01 药价改定一致。
- **剂量**：日本指南表2 = 10 mg/2–3周、20 mg/2–4周；WPATH/Endocrine = 5–30 mg/2周或2–10 mg/周；三处分别核对原文。
- **目标**：WPATH/Endocrine = E2 100–200 pg/mL、T <50 ng/dL；WPATH 同时说“最佳范围未确立”。
- **VTE**：Getahun 2018/Nota 2019 的数值逐条对照摘要；口服 vs 经皮的 OR/RR 对照荟萃分析。
- **乳腺癌**：de Blok 2019 的 15 例/2,260人/33,991人年/SIR 46.7 vs 0.3。
- **Prolactin**：Nota 2017 + 日本 Uryu 2023 病例。
- **保险**：2026 答申原文 + 2018 問199 原文 + 2025 调查统计。
- **供应**：富士 2026-06-19 通知 + 2026-11-20 供应状况 + 厚劳省 2026-11-25 数据。

---

## 6. 主要局限

1. **没有 IM EV 的 RCT**；没有足够大的 IM EV 专属 VTE/心血管/乳腺癌/肝脏结局研究。
2. **说明书 PK 是“外国人データ”**；日本芝麻油制剂没有正式 PK 研究。
3. **日本指南表2在2025-11-19再补正PDF中为空白页**（pypdf 提取问题）；表2内容取自 2024-10-16 版，但内容未变。
4. **JSOG 2023/2026、JMWH 2025 的 CQ 全文付费**，未能逐字核对；只使用了 2020 CQ429 的公开信息。
5. **德国 BfArM 的正式取消通知未找到**；德国“退出市场”依据商业药房数据库 + 奥地利 BASF + 瑞典 FASS，属于间接证据。
6. **欧洲制剂添加剤**（蓖麻油+苯甲酸苄酯）来自意大利 SmPC 再掲，德国具体制剂未直接确认。
7. **社区信息不可靠**：Reddit/X/博客自选、无验证、剂量错误、假药混杂；只用于背景/危害 Reduction。
8. **价格/供应变化快**：2026年6月起限定出荷，截至2026-11-20未解除；之后可能变化。
9. **法律/保险变化**：2023最高法院判决、2025下级法院判决、2026答申；之后可能修法/改运用。
10. **本文不是医疗建议**：所有临床决定需由合格医师做出。

---

## 7. 文件组织

```
report/
  00_executive_summary.md      一页式总览
  01_product_official_profile.md  产品官方资料
  02_mtf_gaht_context.md       MtF GAHT 指南/日本实践/保险
  03_safety_and_monitoring.md  安全性与监测
  04_evidence_and_literature.md  PK/文献
  05_practice_community_and_availability.md 诊所/社区/供应
  06_sources.md                来源清单
  07_faq.md                    常见问题
  08_verbatim_quotes.md        关键原文
  09_methodology.md            本文件
  PROGYNON_DEPOT_FULL_REPORT.md 以上 00–08 的合并版
  README.md                    导航

research/
  00_verified_guideline_excerpts.md  主代理核对摘录
  01_international_gaht_guidelines.md
  02_japan_gaht_practice.md
  03_estradiol_valerate_literature.md
  04_product_regulatory_safety.md
  05_community_patient_info.md
  （以及 subagent 下载的 PDF/TXT）

sources/
  官方产品页 HTML/TXT
  添付文書 PDF / IF PDF / 文本提取
  PMDA 电子添附文书 HTML/PDF
  PMDA 改订指示/HRT 警告
  富士供应通知/供应状况
  MHLW 2023/2025 报告
  JSPN 指南第5版/再补正
  总务省答申
  WPATH/Endocrine 全文
```

---

## 8. 如何引用本资料

- 引用产品事实：优先引 `01` + `08` 的原文，并注明 PMDA/富士制药文档日期。
- 引用指南剂量：优先引 `02` + `08` 的原文，并注明指南版本/表号。
- 引用安全性：优先引 `03` + `04`，并注明研究设计/人群/局限。
- 引用日本现实：优先引 `02`/`05` + MHLW 报告，并注明是设施调查/当事者调查。
- 引用社区：必须标注 **【D】**，不能作为临床依据。

---

## 9. 免责声明

本资料是文献/公开信息整理，不是医疗建议。产品为日本处方药；MtF GAHT 使用属于超说明书、原则上不保险。任何用药、剂量、监测、停药、换药决定必须由具备跨性别医疗经验的医师做出。
