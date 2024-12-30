const cheerio = require('cheerio');
const axios = require("axios");
const { FETCH_INFO } = require('../../config.js');



function axioxInit(region) {
    const { shopifyApiUrl, shopifyKey, AMAZON_URL, COOKIE } = FETCH_INFO[region];
    axios.defaults.headers.common['X-Shopify-Access-Token'] = shopifyKey;
    const myHeaders = {
        'authority': AMAZON_URL, 
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', 
          'accept-language': 'zh-CN,zh;q=0.9,de-DE;q=0.8,de;q=0.7,en;q=0.6', 
          'cache-control': 'max-age=0', 
          'device-memory': '8', 
          'downlink': '10', 
          'dpr': '2', 
          'ect': '4g', 
        //   'referer': 'https://www.amazon.fr/dp/B0BXDSPSPW', 
          'rtt': '100', 
          'sec-ch-device-memory': '8', 
          'sec-ch-dpr': '2', 
          'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"', 
          'sec-ch-ua-mobile': '?0', 
          'sec-ch-ua-platform': '"macOS"', 
          'sec-ch-ua-platform-version': '"13.6.1"', 
          'sec-ch-viewport-width': '1651', 
          'sec-fetch-dest': 'document', 
          'sec-fetch-mode': 'navigate', 
          'sec-fetch-site': 'same-origin', 
          'sec-fetch-user': '?1', 
          'upgrade-insecure-requests': '1', 
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36', 
          'viewport-width': '1651', 
          'Cookie': COOKIE
    };
    return {myHeaders}
}


const fetchAmazonInfo = async ({data, region, handleType}) => {
    console.log("region============", region)
    const { shopifyApiUrl, shopifyKey, AMAZON_URL, COOKIE } = FETCH_INFO[region];
    const {myHeaders} = axioxInit(region)
    const sku = data.sku || data.SKU
    const asin = data.asin || data.ASIN
    console.log('当前 sku：', sku, asin)
    const link = `${AMAZON_URL}/${asin}`
    console.log(link, ":---------------")

    try {
        const result = await axios.get(`${link}`, {
            headers: myHeaders
        })
        if (result.status > 300) {
            console.log(`请求成功，但是状态码不是200，而是${result.status}，sku为${sku}`)
            return Promise.resolve({
                sku,
                asin: asin,
                error: '错误码' + result.status,
                link
            })
        }
        const html = result.data;
        const $ = cheerio.load(html);
        const title = $('#productTitle').text();
        const price = getPrice($, sku)
        const deal = getDeal($)
        const compare_at_price = getBasisPrice($)
        const primePrice = getPrimePrice($)
        const volume = getVolume($)
        console.log(price, '----------price')
        if(handleType === "price") {
            return {
                title,
                price,
                sku,
                deal,
                compare_at_price,
                primePrice,
                volume,
                asin: asin,
                link,
            }
        }
        
        const scriptTag = $($('#imageBlock_feature_div > script[type="text/javascript"]')[0]).text()

        const specTag = $('#productOverview_feature_div  table > tbody tr').toArray()
        const images = getImages(scriptTag, asin) || []
        const body_html = getBodyHtml($) || ''
        const specs = getSpec(specTag, $, sku) || ''
        const short_description = getShortDesc($) || ''
        return {
            title,
            price,
            sku,
            deal,
            compare_at_price,
            primePrice,
            volume,
            asin: asin,
            link,
            images,
            body_html,
            specs,
            short_description
        }
    } catch (err) {
        console.log(`单个request失败, sku: ${sku}`)
        console.log(err?.response?.status || err)
  
        return Promise.resolve({
            sku,
            asin: asin,
            error: '请求错误:' + err?.response?.status || err,
            link
        })
    }

}

function getPrice($, sku) {
    if (!$('#apex_offerDisplay_desktop #corePrice_feature_div').html()) {
        console.log('没有价格：', sku)
        return false
    }
    if ($('#apex_desktop #apex_desktop_usedAccordionRow').css('display') === 'none') {
        $('#apex_desktop #apex_desktop_usedAccordionRow').css('display', 'none').remove()
    }
    if ($('#apex_offerDisplay_desktop #corePrice_feature_div').length > 1) {
        return $($($('#apex_offerDisplay_desktop #corePrice_feature_div')[0]).find('.a-price .a-offscreen')[0]).text()
    }
    return $('#apex_offerDisplay_desktop #corePrice_feature_div .a-price .a-offscreen').text()
}

function getDeal($) {
    if (!$('.savingsPercentage').length) return '-'
    console.log($($('.savingsPercentage')[0]).text(), 'deal')
    return $($('.savingsPercentage')[0]).text()
}

function getBasisPrice($) {
    if (!$('.basisPrice .a-offscreen').length) return '-'
    console.log($($('.basisPrice .a-offscreen')[0]).text().replace(/,/g, '.'), 'basisPrice')
    return $($('.basisPrice .a-offscreen')[0]).text().replace(/,/g, '.')
}

function getPrimePrice($) {
    if (!$('#primeExclusivePricingMessage .a-size-base').length) return '-'
    console.log($('#primeExclusivePricingMessage .a-size-base').text(), 'primePrice')
    return $('#primeExclusivePricingMessage .a-size-base').text()
}

function getVolume($) {
    if (!$('#promoPriceBlockMessage_feature_div label').length) return '-'
    const regx = /(\p{Sc}?)\s*\d+\s*(\p{Sc}?%?)/gu
    return $('#promoPriceBlockMessage_feature_div label')?.text()?.match?.(regx)?.[0]
}

function getImages(scriptTag, asin) {
    const regexImg = /"hiRes":"([^"]+.(?:jpg|png|gif|jpeg))"/g;
    const matchArray = scriptTag.match(regexImg);
    if (matchArray?.length) {
        const b = matchArray.map(word => word.replace(/"hiRes":/, ''))
        const regex = /.(_AC)?_SL1500_/g;
        const c = b.map(word => JSON.parse(word).replace(regex, ''))
        const productImages = [...new Set(c)]
        console.log("productImages--" + asin, productImages?.length)
        return productImages
    } else {
        throw new Error("获取图片失败")
    }

}

function getSpec(specTag, $, sku) {
    const trs = specTag.map((item, index) => {
        // console.log($(item).html(), index, '----------------------------')
        if (index === 0) return
        const specName = $(item).find('tr td.a-span3').text()
        let specValue = ''
        if ($(item).find('tr td.a-span9 .a-truncate-full').length) {
            specValue = $(item).find('tr td.a-span9 .a-truncate-full').text()
        } else {
            specValue = $(item).find('tr td.a-span9').text()
        }
        return `<tr><td><b>${specName}</b></td><td>${specValue}</td></tr>`
    }).filter(Boolean).join('')
    return `<table class="ug-product-specs"><tr><td><b>Sku</b></td><td>${sku}</td></tr>${trs}</table>`
}

function getShortDesc($) {
    $('#replacementPartsFitmentBullet').remove() // 删除第一个li
    const shortDescriptionTag = $('#feature-bullets > ul > li').toArray()
    const lis = shortDescriptionTag.map((item, index) => {
        return `<li>${$(item).text()}</li>`
    })
    return `<ul>${lis.join('')}</ul>`
}

function getBodyHtml($_) {
    const $bodyHtml = $_('#aplus_feature_div').html() ?? $_('#aplusBatch_feature_div').html()
    console.log($bodyHtml?.length, '---bodyHtmllength---')
    if (!$bodyHtml || $bodyHtml?.length < 800) {
        return 'body html empty'
    }
    const $ = cheerio.load($bodyHtml)
    // $('#aplus_feature_div  hr').remove()
    // $('#aplus_feature_div  script').remove()
    // $('#aplus_feature_div  style').remove()
    // $('#aplus_feature_div  h2').remove() // 移除 desc 标题

    $('hr').remove()
    $('script').remove()
    $('style').remove()
    $('h2').remove() // 移除 desc 标题
    // $('#aplus_feature_div .aplus-standard').remove() // 移除对比表格
    // console.log($('#aplus_feature_div > script').html(), 'caoa')
    $('.premium-module-8-hero-video').remove() // 移除视频
    $('.premium-module-5-comparison-table-scroller').remove() // 移除功能对比
    $('.premium-module-11-faq').remove() // 移除 faq
    // $('.a-carousel-left').remove() // 移除 carousel 左箭头
    // $('.a-carousel-right').remove() // 移除 carousel 右箭头
    // $('.a-section aplus-carousel-actions').remove() // 移除 carousel 按钮
    $('.module-5.aplus-standard').remove() // 移除 对比表格
    $('.premium-module-19-comparison-table-traditional').remove() // 移除 对比表格
    $('.aplus-comparison-table-content-container').remove() // 移除 对比表格
    $('.premium-module-9-comparison-table-carousel').remove()
    $('.a-carousel-viewport').addClass('swiper')
    $('.a-carousel-viewport > .a-carousel').addClass('swiper-wrapper')
    $('.a-carousel-viewport > .a-carousel li').addClass('swiper-slide')
    return $.html()
}


module.exports = fetchAmazonInfo;