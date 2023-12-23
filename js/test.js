// 主函数
async function testMain() {
  // 最优线路
  let bestLine = "";
  // 最大测试连接时间
  let maxConnectTime = lineConfig.maxConnectTime;
  // 所有线路
  let lines = lineConfig.line_list;
  // 测试次数
  let numTests = lineConfig.numTests;
  // 访问位置参数名
  let accessParam = lineConfig.accessParam;
  // 当前最优线路连接时间
  let curMinAvgLatency = maxConnectTime;

  // 获取访问路径
  const url = new URL(window.location);
  let tpUrl = url.searchParams.get(accessParam)
    ? url.searchParams.get(accessParam)
    : "";

  let count = 0;
  const totalLineNum = lines.length - 1;

  // 分别测算
  for (const line of lines) {
    const tip =
      "正在测试线路：" + line.name + "(" + count + "/" + totalLineNum + ")";
    console.log(tip);
    count++;
    const { reachable, maxLatency, avgLatency } = await testSubdomain(
      tip,
      line,
      curMinAvgLatency,
      numTests
    );
    if (reachable & (avgLatency != -1) && avgLatency < curMinAvgLatency) {
      bestLine = line;
      curMinAvgLatency = avgLatency;
    }
    console.log(
      "当前最佳平均延迟：",
      curMinAvgLatency,
      "ms，线路：",
      bestLine.name
    );
  }

  if (bestLine) {
    document.querySelector("p").innerText =
      "检测完成，正在重定向到线路：" + bestLine.name;
    const url = "https://" + bestLine.sub + ".iuoyt.com" + tpUrl;
    console.log("正在重定向到线路：" + bestLine.name + "(" + url + ")");
    window.location.href = url; // 自动重定向到最佳线路
    // 获取显示倒计时的元素
    const countdownElement = document.getElementById("countdown");
    countdownElement.style.opacity = "0";
    // 2秒钟后未成功定向，显示提示
    const container = document.getElementById("container");
    const buttonElement = document.getElementById("button");
    // 为按钮添加点击事件
    buttonElement.addEventListener("click", function () {
      window.location.href = url; // 手动重定向到最佳线路
    });
    setTimeout(() => {
      if (window.location.href != url) {
        // 显示提示：若未成功定向，点击按钮手动重定向
        countdownElement.textContent = "未成功定向？点击按钮手动访问";
        // 显示按钮
        container.style.height = "210px";
        // 等待0.3秒后显示按钮
        setTimeout(() => {
          buttonElement.style.opacity = "1";
          countdownElement.style.opacity = "1";
        }, 100);
      }
    }, 1500);
  } else {
    // 没有可访问的线路
    document.querySelector("p").innerText = pageConfig.allLineErrTips;

    // 设置初始倒计时时间（秒）
    let countdownTime = 3;
    // 获取显示倒计时的元素
    const countdownElement = document.getElementById("countdown");
    // 创建一个函数来更新倒计时并刷新页面
    function updateCountdown() {
      countdownTime--;
      countdownElement.textContent = countdownTime + " 秒后重新刷新";
      if (countdownTime <= 0) {
        // 当倒计时结束时，刷新页面
        window.location.reload();
      } else {
        // 继续更新倒计时
        setTimeout(updateCountdown, 1000); // 每秒更新一次
      }
    }
    // 开始倒计时
    updateCountdown();
  }
}

// 测试函数，使用fetch来测试连接
async function testSubdomain(tip, line, maxConnectTime, numTests) {
  try {
    let curMaxLatency = 0;
    let totalLatency = 0;

    for (let i = 0; i < numTests; i++) {
      document.querySelector("p").innerText =
        tip + "，第" + (i + 1) + "/" + numTests + "次检测";
      const controller = new AbortController();
      const signal = controller.signal;

      const start = performance.now(); // 记录开始时间
      const responsePromise = fetch(line.testUrl, {
        method: "HEAD", // 使用HEAD方法可以减少响应内容的传输，加快测试速度
        signal, // 将signal传递给fetch以支持中止操作
      });

      const timeoutPromise = new Promise((resolve, reject) =>
        setTimeout(() => {
          controller.abort(); // 中止异步操作
          // reject(new Error("超过最大延迟时间"));
        }, maxConnectTime)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);

      // 如果测试还未完成，而是因为超过了最大延迟时间而被中止
      if (response instanceof Error) {
        console.log(
          "[" + line.name + "]线路状态: 不可达, 延迟: 超过最大延迟时间"
        );
        return { reachable: false, maxLatency: -1, avgLatency: -1 };
      }

      await response.text(); // 等待响应内容传输完成
      const end = performance.now(); // 记录结束时间

      const latency = end - start; // 计算延迟时间
      console.log("第" + (i + 1) + "次检测：" + latency + "ms");

      curMaxLatency = latency > curMaxLatency ? latency : curMaxLatency;
      totalLatency += latency;
    }

    const averageLatency = totalLatency / numTests;
    console.log("[" + line.name + "]平均延迟:" + averageLatency + "ms");

    return {
      reachable: true,
      maxLatency: curMaxLatency,
      avgLatency: averageLatency,
    };
  } catch (error) {
    console.error("强制中断测试：超过当前最大等待时间", maxConnectTime, "ms");
    return { reachable: false, maxLatency: -1, avgLatency: -1 };
  }
}
