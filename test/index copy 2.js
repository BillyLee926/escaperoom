const puppeteer = require('puppeteer');
const CryptoJS = require("crypto-js");

(async () => {
    try {
      const browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();

      let firstServerTime;
      let capturedServerTime;
      const currentTimeMillis = Date.now();
      console.log('로컬시간 :', currentTimeMillis);
      while (true) {
        const response = await page.goto('https://www.keyescape.co.kr/web/home.php?go=rev.make', {waitUntil: 'domcontentloaded'});
        const serverTimeHeader = response.headers()['date'];
        const serverTime = new Date(serverTimeHeader);
        console.log('서버시간 (Header):', serverTime);

        if (!firstServerTime) {
          firstServerTime = serverTime;
        } else {
          const elapsedTime = serverTime - firstServerTime;
          if (elapsedTime >= 2000) {
            capturedServerTime = serverTime;
            break;
          }
        }
      }
      console.log('측정된 서버시간:', capturedServerTime);

      page.on('dialog', async dialog => {
        try {
          await dialog.dismiss();
        } catch (e) {
          console.error(e);
        }
      });

      let isNameInputReady = false;
      let isSessionResponseProcessed = false;

      page.on('framenavigated', async () => {
        try {
          await page.waitForSelector('input[name="name"]', { visible: true, timeout: 600000 });
          await page.evaluate(() => {
            document.querySelector('input[name="name"]').value = '이혁주';
            document.querySelector('input[name="mobile2"]').value = '7748';
            document.querySelector('input[name="mobile3"]').value = '2664';
            document.querySelector('input[name="ck_agree"]').checked = true;
          });
          isNameInputReady = true;
          if (isNameInputReady && isSessionResponseProcessed) {
            await page.evaluate(() => {
              const submitButton = document.querySelector('a[href="javascript:fun_submit()"]');
              submitButton.click();
            });
          }
        } catch (e) {
          console.error(e);
        }
      });

      page.on('framenavigated', async () => {
        try {
          const currentUrl = page.url();
          console.log('Current URL:', currentUrl);

          const paymentLinkSelector = 'a[href="javascript:fun_payment_mutong()"]';
          await page.waitForSelector(paymentLinkSelector, { visible: true, timeout: 600000 });
          await page.click(paymentLinkSelector);
        } catch (e) {
          console.error(e);
        }
      });

      await page.evaluate(() => {
        const observer = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              const timeElement = Array.from(document.querySelectorAll('a'))
                                      .find(el => /javascript:fun_theme_time_select\('.*','7'\)/.test(el.href));
              if (timeElement) {
                timeElement.click();
                document.querySelector('a[href="javascript:fun_submit()"]').click();
                observer.disconnect();
              }
            }
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      });

      let md5Hashes = {};
      for (let i = 1000; i <= 99999; i++) {
        const hash = CryptoJS.MD5(i.toString()).toString();
        md5Hashes[hash] = i;
      }

      page.on('response', async response => {
        try {
          if (response.url().endsWith('session.php')) {
            const responseText = await response.text();
            if (responseText in md5Hashes) {
              const matchingNumber = md5Hashes[responseText];
              await page.waitForSelector('input[name="input_captcha"]', { visible: true });
              await page.evaluate((matchingNumber) => {
                const captchaInput = document.querySelector('input[name="input_captcha"]');
                if (captchaInput) {
                  console.log(`Setting captcha value: ${matchingNumber}`);  // 상태 확인을 위한 로그
                  captchaInput.value = matchingNumber;
                }
              }, matchingNumber);
              isSessionResponseProcessed = true;
              if (isNameInputReady && isSessionResponseProcessed) {
                await page.evaluate(() => {
                  const submitButton = document.querySelector('a[href="javascript:fun_submit()"]');
                  submitButton.click();
                });
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      });

      try {
        const timeDifference = capturedServerTime - currentTimeMillis;
        console.log(`서버로컬시간차이 ${timeDifference}`);
        const scheduledTime = new Date('2023-10-31T01:29:58.300Z').getTime() - timeDifference;
        console.log(`예정실행시간 ${scheduledTime}`);
        const delay = scheduledTime - currentTimeMillis;
        console.log(`딜레이 ${delay}`);

        if (delay > 0) {  
            const intervalId = setInterval(() => {
                const currentMillis = Date.now();
                const remainingTime = scheduledTime - currentMillis + timeDifference;
    
                if (remainingTime <= 20000 && remainingTime > 1000) {
                    console.log(`남은시간: ${Math.ceil(remainingTime / 1000)} seconds`);
                } else if (remainingTime <= 1000) {
                    clearInterval(intervalId)   ;
                }
            }, 1000);
    
            console.log(`${delay} 밀리초 후 예약진행.`);
            setTimeout(async () => {
                try {
                    clearInterval(intervalId);
                    await page.evaluate(() => {
                        const storeElement = document.querySelector('a[href="javascript:fun_theme_select(\'59\',\'2\')"]');
                        storeElement.click();
                    });
                } catch (error) {
                    console.error("An error occurred during the page evaluation:", error);
                }
            }, delay);
        } else {
            console.log("Scheduled time is in the past.");
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
    

    } catch (e) {
      console.error(e);
    } finally {
      // 필요한 경우 browser.close();
    }
})();
