# pi-Harness-packages

Pi-Harness 官方主题和桌宠。每个目录是一套独立资源，在 Pi-Harness 市场里单独安装。

资源发布在这个仓库的 GitHub Releases。每个目录对应一个 ZIP，标签格式是 `pet-bigfish-3-v1.0.2`。市场清单是 `market-index` 分支上的 `catalog.json`，只记录已经发布成功的 ZIP。

推送到 `main` 时，Actions 只发布本次改动的目录。第一次发布全部资源，或只发布一个目录时，手动运行 **Release packs**：

- 发布全部：Package directory 留空。
- 只发布一个：填写目录名，例如 `pet-bigfish-3`。

同一个版本内容不变会跳过。同一个版本内容变了会停止，需要先提高该目录 `package.json` 的 `version`。

## 主题

| 目录 | 名称 |
| --- | --- |
| `theme-phoebe` | Phoebe |
| `theme-office` | Office |
| `theme-maid-white` | Maid White |
| `theme-moonlit-maid` | Moonlit Maid |
| `theme-noir-scholar` | Noir Scholar |
| `theme-starship` | Starship Cockpit |
| `theme-ming-moon` | Ming Moon City |
| `theme-ming-snow` | Ming Snow Palace |
| `theme-claude` | Claude |
| `theme-gemini` | Gemini |
| `theme-gpt` | GPT |
| `theme-glm` | GLM |
| `theme-grok` | Grok |
| `theme-kimi` | Kimi |
| `theme-qwen` | Qwen |
| `theme-deepseek` | DeepSeek |
| `theme-zhang-juzheng` | Zhang Juzheng |

## 桌宠

| 目录 | 名称 |
| --- | --- |
| `pet-jelly` | Jelly |
| `pet-ghost` | Ghost |
| `pet-circle` | Circle |
| `pet-rounded` | Rounded |
| `pet-star` | Star |
| `pet-triangle` | Triangle |
| `pet-bigfish` | BigFish |

`pet-bigfish` 是基础桌宠。`pet-bigfish-2` 到 `pet-bigfish-20` 是可选动作，装上后加到同一只 BigFish。只装想要的动作即可。

| 目录 | 动作 |
| --- | --- |
| `pet-bigfish-2` | 安静眨眼、抱尾打盹、抱尾举牌、抱尾撒娇、擦汗歇息、操作检查、侧躲探头、高高举牌、乖巧鞠躬、挥手跳跃鞠躬 |
| `pet-bigfish-3` | 挥手招呼、回头看看、交替打字、开心摇尾、踉跄站稳、牌后探头、跑步赶进度、捧杯喝茶、伸懒腰、伸手示意 |
| `pet-bigfish-4` | 手忙脚乱、缩肩反应、叹气放松、完成打勾、小碎步赶工、小跳摇牌、胸前举牌、阅读翻页、左右探头 |
| `pet-bigfish-5` | 把选择递给你、贝壳小把戏、便签打字、擦掉重画、擦干净再举牌、擦亮尾巴、草稿演算、测试巡检、齿轮咔哒转、打包小行李箱 |
| `pet-bigfish-6` | 戴眼镜排查、弹出式请帖、递来确认信、调色画画、多任务分篮、翻到等你这一页、放大镜找线索、分你半块饼干、扶好眼镜再写、给尾巴铺小窝 |
| `pet-bigfish-7` | 观察沙漏、荷叶小伞、画一张路线图、画一张小自画像、检查小接线、交付小礼物、浇一盆小水草、鲸鱼验收章、开心收工、看守小生态箱 |
| `pet-bigfish-8` | 口袋里掏出小牌、困惑地图、牌子拿反了、牌子太大了、泡泡落在头上、拼出等候牌、拼起思路、启动小控制台、气球托起牌、铅笔修改 |
| `pet-bigfish-9` | 轻摆提示铃、清理后再试、上发条小鲸鱼、深吸气再开工、书堆找答案、梳梳尾巴边、算盘推演、听听贝壳、挽袖开工、望远镜看网页 |
| `pet-bigfish-10` | 尾巴打拍子、尾巴当支架、尾巴先收好、先保住茶杯、小导演带队、小鲸鱼敬礼、小幕布揭牌、阅读夹书签、眨眼稳住节奏、蘸墨写草稿、折叠小横幅 |
| `pet-bigfish-11` | 折一只纸鱼、整理便签、整理交付包、整理鲸鱼徽章、织一条鲸鱼围巾、值班鲸鱼盖章、纸飞机送信、纸花庆祝、纸鱼小船队、转椅半圈、追一颗泡泡 |
| `pet-bigfish-12` | 被落叶淹没、被吓一跳、变鸽子、插茱萸赏菊、拆礼物、晨间刷牙、吃白饭、吃冰淇淋融化、吃大闸蟹、吃饺子 |
| `pet-bigfish-13` | 吃腊八粥、吃年糕、吃青团、吃汤圆、吃糖葫芦、吃晚餐、吃午餐、吃西瓜、吃早餐、吃长寿面 |
| `pet-bigfish-14` | 吃重阳糕、吃粽子、抽陀螺、穿针乞巧、吹笛子、吹气球、打瞌睡被惊醒、大口吃零食、荡秋千、点击回应-傲娇生气 |
| `pet-bigfish-15` | 点击回应-害羞惊讶、点击回应-开心跃动、东张西望、动物环绕、堆雪人、放风筝、放河灯、放孔明灯、放烟花、蝴蝶蜜蜂环绕头顶开花 |
| `pet-bigfish-16` | 可爱宅舞、蓝鲸现世、撸猫、萌化小幽灵、女仆屈膝礼仪、螃蟹走路、漂浮踏步、凭空生花、扑克魔术、骑木马 |
| `pet-bigfish-17` | 轻快记录、轻快摇摆舞、三球抛接、深度思考碎碎念、是啊，吃什么、收红包、涮火锅、碎碎念-擦桌碎碎念、碎碎念-对屏碎碎念、碎碎念-发呆碎碎念 |
| `pet-bigfish-18` | 讨糖南瓜灯、踢毽子、偷吃零食被抓住、玩水枪、玩游戏气急败坏、舞狮头、下五子棋、小幅度原地360度旋转展示、小提琴演奏、写代码 |
| `pet-bigfish-19` | 写福字、摇扇纳凉、用鲸鱼尾巴拍打地面、优雅女仆舞、悠闲哼歌、余额-袋空如洗、余额-分文不剩、余额-金袋叮当、余额-钱袋满溢、余额-钱袋如常、余额-数金皱眉 |
| `pet-bigfish-20` | 原地蹲下玩玩具汽车、原地敲击桌面互动、原地跳跃抓碎头顶物品、原地小憩沉眠、原地重力下蹲压缩、原地专心玩魔方、照镜子、整体换装试色、中秋赏月吃月饼、装点圣诞树、左转奔跑 |
