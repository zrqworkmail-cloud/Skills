# Llama 4 案例：经验与适用边界

本记录是制作经验，不是当前模型资料的替代品。再次制作时需核对 Meta 官方版本及发布状态。

## 已选定的两条制作链

- MP4：Llama4-MoE-Full-1080p-v7.mp4，参考融合版；精确交付片段来自 ppt-media-v7。
- PPT：案例的逐页可控视频 PPT，17 页；内嵌视频逐项散列与 ppt-media（v6）一致。
- 两者均约 15 分钟，但并非相同视频的两种容器。不要把后出的 v7/v8 PPT 当作用户选中的 PPT。
- 当前 npm render 对应主 Remotion 编排，不能据此声称直接产出 v7；v7 曾使用参考组件渲染、片段重组及树页面最后修订。精确媒体归档比仅留一份源码 ZIP 更可靠。

## 技术画面需要表现的关系

本案例公开参考实现采用 Top-1 选择、选中得分 Sigmoid、门控缩放 Routed Expert 输入，Shared Expert 接收原输入；两分支相加。输入门控不可随意移到非线性专家输出。统一向量约定；例如行向量时 SwiGLU 写作 (SiLU(zW1) ⊙ zW3)W2，与 Router 的 xWr 保持一致。不要把知识蒸馏训练示意损失说成官方完整损失，不臆测负载均衡训练法。

400B 总参数与 17B 激活参数的示意使用 400 个单位块，其中 17 个高亮；只是参数量示意，不是 400 个专家。专家图另标 Routed Experts 数量。教师/学生的训练知识传递与推理时 Token 路由需分镜区分。

参考组件确实复用了云图激活、矩阵网格、FFN 内部双支和历史树的运动逻辑，再做浅色和技术修正。树要区分时间线、家族与架构继承，不能用连线暗示未经证实的继承。保留来源清单，用户授权复用不等于公开再分发许可。

## 失败后形成的检查点

- 只移动 Router 和连线，Token 仍走旧轨迹：让节点与 Token 使用同一条路径定义。
- 展开 MoE 示意被画成串行真实数据流：主计算图与模块内部展开明确分隔。
- 为压缩时间整体倍速或固定片长，导致 400B 云图未展开完全；v8 不是本次最终选择。以动作完成为前提调整阅读停留，不套用 v8 节奏到选定成品。
- 新 FFN/Expert 动画与旧解释叠加，产生重复：先写替换映射，再接时间轴。
- PlayOnEntry 单独设置仍可能生成 clickEffect；PowerPoint COM 还要将播放效果 Timing.TriggerType 设置为 2，并检查 XML 的 withEffect。
- Fill.UserPicture 不能可靠设置视频封面；用 MediaFormat.SetDisplayPictureFromFile。
- 起始帧可能是尚未进入的空白状态；封面取完整且有代表性的状态。
- 每页视频铺满，禁止外链；AdvanceOnTime=0、AdvanceOnClick=-1，开启媒体控件。

归档中的旧审核 JSON 可能早于最后一次树布局修正，只作为历史证据。最终散列和本次结构审核以新的 archive-manifest 与 selected-products-audit 为准。
