async function concurrentRequest({ dataset, fetch, maxConcurrency = 6, region, handleType }) {
    const results = [];
    // 创建一个队列，用于存储待请求的URL
    const queue = [...dataset];
    async function makeRequest(data) {

        try {
            const result = await fetch({data, region, handleType});
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error };
        }
    }

    // 分段地发起请求，直到所有请求都被处理完
    while (queue.length > 0) {
        try {
            // 取出队列中的一组 URL（最多 maxConcurrency 个）
            const dataBatch = queue.splice(0, maxConcurrency);
            // 发起一组请求
            const promiseSettled = await Promise.allSettled(dataBatch.map(makeRequest));
        // 将所有 promise 的结果添加到 results 数组中
        results.push(...promiseSettled);
        console.log('-------------------------剩余请求数量:', queue.length)
        } catch (error) {
            console.log("批量处理错误：", error)
        }
    }
    // 对结果数组进行分类，成功的请求放到 success 数组中，失败的请求放到 error 数组中
    const success = [];
    const error = [];
    results.forEach((result) => {
        if (result.status === 'fulfilled') {
            success.push(result.value.data);
        } else {
            error.push(result.reason);
        }
    });

    // 返回成功和失败的请求
    return { success, error };
}

module.exports = concurrentRequest;