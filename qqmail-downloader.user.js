// ==UserScript==
// @name         QQ邮箱附件批量下载器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  批量下载QQ邮箱附件，支持筛选、排序和批量操作
// @author       XHXIAIEIN
// @homepage     https://github.com/XHXIAIEIN/Auto-Download-QQMail-Attach/
// @match        https://wx.mail.qq.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_notification
// @connect      mail.qq.com
// @connect      wx.mail.qq.com
// @license      MIT
// @connect      gzc-dfsdown.mail.ftn.qq.com
// @downloadURL   https://update.greasyfork.org/scripts/535160/qqmail-downloader.user.js
// @updateURL     https://update.greasyfork.org/scripts/535160/qqmail-downloader.meta.js
// ==/UserScript==

(function () {
    'use strict';

    class StyleManager {
        static getStyles() {
            return {
                base: {
                    panel: `position: fixed; background: var(--bg_white_web, #FFFFFF); border-radius: 8px; box-shadow: var(--shadow_4, 0 8px 12px 0 rgba(19, 24, 29, 0.14)); z-index: 10000; display: flex; flex-direction: column;`,
                    overlay: `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--mask_gray_030, rgba(0, 0, 0, 0.3)); z-index: 9999; display: flex; align-items: center; justify-content: center;`,
                    toolbar: `display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--base_gray_007, rgba(21, 46, 74, 0.07)); background: var(--bg_white_web, #FFFFFF); border-radius: 8px 8px 0 0;`,
                    content: `flex: 1; min-height: 0; overflow: auto; padding: 20px;`
                },
                buttons: {
                    primary: `padding: 8px 16px; background: var(--theme_primary, #0F7AF5); color: var(--base_white_100, #FFFFFF); border: 1px solid var(--theme_darken_2, #0E66CB); border-radius: 4px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px; transition: all 0.2s; box-shadow: var(--material_BlueButton_Small);`,
                    secondary: `padding: 8px 16px; background: var(--bg_white_web, #FFFFFF); color: var(--base_gray_080, rgba(22, 30, 38, 0.8)); border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); border-radius: 4px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px; transition: all 0.2s;`,
                    icon: `width: 32px; height: 32px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); border-radius: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;`
                },
                cards: {
                    attachment: `background: var(--bg_white_web, #FFFFFF); border: 1px solid var(--border_gray_010, rgba(22, 46, 74, 0.05)); border-radius: 8px; overflow: hidden; cursor: pointer; transition: box-shadow 0.2s, border 0.2s; position: relative; aspect-ratio: 1; box-shadow: none;`,
                    mail: `background: var(--bg_white_web, #FFFFFF); border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); border-radius: 8px; margin-bottom: 16px; overflow: hidden; transition: box-shadow 0.2s;`
                },
                controls: {
                    checkbox: `position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; z-index: 10; accent-color: var(--theme_primary, #0F7AF5); cursor: pointer; background: rgba(255,255,255,0.9); border-radius: 4px; box-shadow: 0 1px 4px 0 rgba(21,46,74,0.08); opacity: 0.9; transition: opacity 0.2s, box-shadow 0.2s; border: 1px solid var(--border_gray_020, #e0e6ed);`
                },
                menus: {
                    dropdown: `position: fixed; background: var(--bg_white_web, #FFFFFF); border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.08)); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); padding: 8px 0; min-width: 160px; z-index: 1001;`,
                    item: `padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--base_gray_100, #13181D); transition: background 0.2s;`
                },
                states: {
                    loading: `position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--mask_white_095, rgba(255, 255, 255, 0.95)); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000;`,
                    empty: `text-align: center; padding: 40px 20px; color: var(--base_gray_030, rgba(25, 38, 54, 0.3)); font-size: 14px;`,
                    spinner: `width: 32px; height: 32px; border: 2px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); border-top: 2px solid var(--theme_primary, #0F7AF5); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;`
                },
                toasts: {
                    base: `position: fixed; top: 20px; right: 20px; padding: 12px 16px; border-radius: 6px; color: white; font-size: 13px; z-index: 10002; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); display: flex; align-items: center; gap: 8px; max-width: 320px; word-wrap: break-word; opacity: 0; transform: translateX(100%); transition: all 0.3s ease;`,
                    info: `background: var(--theme_primary, #0F7AF5);`,
                    success: `background: var(--chrome_green, #00A755);`,
                    warning: `background: var(--chrome_yellow, #FFA500);`,
                    error: `background: var(--chrome_red, #F73116);`
                },
                media: {
                    preview: `width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); overflow: hidden;`,
                    image: `width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;`,
                    icon: `font-size: 24px; color: var(--theme_primary, #0F7AF5); display: flex; align-items: center; justify-content: center; height: 100%; transition: transform 0.3s ease;`
                },
                layouts: {
                    grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; padding: 16px; background: transparent;`,
                    floatingWindow: `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 75%; max-width: 900px; height: 95%; max-height: 95vh; min-width: 600px; min-height: 700px; background: #fff; border-radius: 12px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1); z-index: 10000; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; resize: both;`,
                    floatingOverlay: `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); z-index: 9999; opacity: 0; transition: opacity 0.3s ease;`,
                    windowHeader: `display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #fff; border-bottom: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); cursor: move; user-select: none; flex-shrink: 0;`,
                    windowContent: `flex: 1; overflow: hidden; display: flex; flex-direction: column; background: #f5f5f5;`,
                    windowControls: `display: flex; align-items: center; gap: 8px;`,
                    windowButton: `width: 12px; height: 12px; border-radius: 50%; cursor: pointer; transition: all 0.2s ease;`,
                    closeButton: `background: #ff5f57; border: 1px solid #e0443e;`,
                    minimizeButton: `background: #ffbd2e; border: 1px solid #dea123;`,
                    maximizeButton: `background: #28ca42; border: 1px solid #1aab29;`,
                    bentoGrid: `display: flex; flex-direction: column; gap: 24px; padding: 32px; max-width: 800px; margin: 0 auto; min-height: 100%; background: #f8f9fa;`,
                    bentoCard: `background: var(--bg_white_web, #FFFFFF); border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); border-radius: 12px; padding: 24px; transition: all 0.2s ease; position: relative; overflow: hidden; min-height: 120px; display: flex; flex-direction: column;`,
                    bentoCardPrimary: `background: rgba(25, 118, 210, 0.05); color: #1976d2; border: 2px solid #1976d2; border-radius: 12px; padding: 24px; position: relative; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08); min-height: 160px; display: flex; flex-direction: column;`,
                    bentoCardWarning: `background: rgba(245, 124, 0, 0.05); color: #f57c00; border: 2px solid #f57c00; border-radius: 12px; padding: 24px; position: relative; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(245, 124, 0, 0.08); min-height: 160px; display: flex; flex-direction: column;`,
                    bentoCardHeader: `background: var(--bg_white_web, #FFFFFF); border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; min-height: 80px;`,
                    bentoRow: `display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%;`,
                    bentoRowResponsive: `display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%;`,
                    bentoRowThree: `display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%;`,
                    bentoRowFour: `display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; width: 100%;`,
                    bentoStatsGrid: `display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 20px; width: 100%;`,
                    bentoStatsResponsive: `display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 20px; width: 100%;`
                },
                dialogs: {
                    compareDialog: `padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); position: relative;`,
                    detailDialog: `position: relative; width: 90%; max-width: 1000px; max-height: 90vh; transform: scale(0.95); transition: transform 0.3s ease;`,
                    settingsOverlay: `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;`,
                    settingsContent: `background: white; border-radius: 16px; padding: 32px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);`,
                    settingsSection: `margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1));`,
                    settingsTitle: `font-size: 24px; font-weight: 700; color: var(--base_gray_100, #13181D); margin-bottom: 24px;`,
                    settingsSectionTitle: `font-size: 18px; font-weight: 600; color: var(--base_gray_090, rgba(22, 30, 38, 0.9)); margin-bottom: 16px;`,
                    settingsItem: `margin-bottom: 20px;`,
                    settingsLabel: `font-size: 14px; font-weight: 600; color: var(--base_gray_080, rgba(22, 30, 38, 0.8)); margin-bottom: 8px; display: block;`,
                    settingsInput: `width: 100%; padding: 12px 16px; border: 1px solid var(--base_gray_020, rgba(22, 46, 74, 0.2)); border-radius: 8px; font-size: 14px; transition: all 0.2s ease; box-sizing: border-box;`,
                    settingsSelect: `width: 100%; padding: 12px 16px; border: 1px solid var(--base_gray_020, rgba(22, 46, 74, 0.2)); border-radius: 8px; font-size: 14px; background: white; transition: all 0.2s ease; box-sizing: border-box;`,
                    settingsCheckbox: `margin-right: 8px; transform: scale(1.2);`,
                    settingsDescription: `font-size: 13px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); margin-top: 4px; line-height: 1.4;`,
                    settingsButtonGroup: `display: flex; gap: 12px; justify-content: flex-end; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1));`,
                    settingsRow: `display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;`,
                    settingsCheckboxItem: `display: flex; align-items: center; margin-bottom: 12px;`
                },
                comparison: {
                    summaryTitle: `display: flex; align-items: center; gap: 12px; margin-bottom: 20px;`,
                    titleAccent: `width: 4px; height: 24px; background: linear-gradient(135deg, #0F7AF5, #40a9ff); border-radius: 2px;`,
                    statsGrid: `display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;`,
                    statCard: `border-radius: 12px; padding: 20px; color: white; position: relative; overflow: hidden;`,
                    statCardDecor: `position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.3;`,
                    statNumber: `font-size: 28px; font-weight: 800; margin-bottom: 4px;`,
                    statLabel: `font-size: 13px; opacity: 0.9;`,
                    statExtra: `font-size: 11px; opacity: 0.7; margin-top: 4px;`,
                    statusCard: `border-radius: 12px; padding: 20px; position: relative; overflow: hidden;`,
                    statusIcon: `position: absolute; top: -20px; right: -20px; font-size: 80px; opacity: 0.1;`,
                    statusHeader: `display: flex; align-items: center; gap: 12px; margin-bottom: 16px;`,
                    statusBadge: `width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;`,
                    statusGrid: `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;`,
                    statusSubCard: `background: rgba(255,255,255,0.6); border-radius: 8px; padding: 16px;`,
                    sectionCard: `background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 20px;`,
                    sectionHeader: `padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;`,
                    sectionIcon: `width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;`,
                    sectionTitle: `margin: 0; font-size: 18px; font-weight: 700;`,
                    sectionSubtitle: `font-size: 13px; opacity: 0.9; margin-top: 2px;`,
                    sectionCount: `text-align: right;`,
                    sectionNumber: `font-size: 24px; font-weight: 800;`,
                    sectionUnit: `font-size: 11px; opacity: 0.8;`,
                    itemList: `max-height: 300px; overflow-y: auto;`,
                    itemRow: `padding: 16px 20px; display: flex; align-items: center; gap: 16px; transition: background 0.2s;`,
                    itemDot: `width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;`,
                    itemContent: `flex: 1; min-width: 0;`,
                    itemName: `font-weight: 600; color: #13181D; margin-bottom: 4px; word-break: break-all;`,
                    itemMeta: `display: flex; align-items: center; gap: 12px; font-size: 12px; color: #666;`,
                    itemTag: `font-size: 11px; padding: 4px 8px; background: #f8f9fa; border-radius: 4px; margin-top: 4px;`,
                    emptyState: `border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;`,
                    emptyIcon: `width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: white; font-size: 24px;`,
                    emptyTitle: `margin: 0 0 8px 0; font-size: 18px; font-weight: 700;`,
                    emptyDesc: `font-size: 14px;`
                },
                progress: {
                    area: `display: block; padding: 16px 20px; border-top: 1px solid var(--base_gray_010, #e9e9e9); background: var(--bg_white_web, #FFFFFF); position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;`,
                    text: `color: var(--base_gray_080, rgba(22, 30, 38, 0.8)); font-size: 13px;`
                },
                errors: {
                    centered: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;`
                },
                interactions: {
                    menuItemHover: `background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); font-weight: 500;`,
                    cardHover: `transform: translateY(-2px); box-shadow: 0 4px 12px 0 rgba(19, 24, 29, 0.12); border-color: var(--base_gray_020, rgba(22, 46, 74, 0.2));`,
                    cardPrimaryHover: `transform: translateY(-2px); box-shadow: 0 4px 16px rgba(25, 118, 210, 0.15); background: rgba(25, 118, 210, 0.08); border-color: #1565c0;`,
                cardWarningHover: `transform: translateY(-2px); box-shadow: 0 4px 16px rgba(245, 124, 0, 0.15); background: rgba(245, 124, 0, 0.08); border-color: #ef6c00;`,
                    buttonHover: `background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); border-color: var(--base_gray_015, rgba(23, 46, 71, 0.15));`,
                    actionButtonHover: `background: var(--theme_primary, #0F7AF5); color: white; transform: translateY(-1px); box-shadow: 0 4px 12px 0 rgba(15, 122, 245, 0.3);`,
                    actionButtonSecondaryHover: `background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); border-color: var(--base_gray_030, rgba(22, 46, 74, 0.3)); transform: translateY(-1px);`,
                    primaryButtonHover: `background: var(--theme_lighten_1, #328DF6);`,
                    downloadButtonHover: `background: #0e66cb; box-shadow: 0 4px 16px 0 rgba(15,122,245,0.13);`,
                    checkboxHover: `opacity: 1; box-shadow: 0 2px 8px 0 rgba(15,122,245,0.12);`,
                    iconHover: `transform: scale(1.05);`,
                    imageHover: `transform: scale(1.02);`
                },
                toolbars: {
                    overlay: `height: 56px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: relative; z-index: 1000; background: var(--bg_white_web, #FFFFFF); border-bottom: 1px solid var(--base_gray_007, rgba(21, 46, 74, 0.07));`,
                    section: `display: flex; align-items: center;`,
                    leftSection: `flex: 1;`,
                    rightSection: `gap: 12px;`,
                    middleSection: `gap: 8px;`
                },
                texts: {
                    title: `margin: 0; font-size: 18px; font-weight: 600; color: #333;`,
                    subtitle: `margin-left: 12px; font-size: 14px; color: #666;`,
                    errorIcon: `color: var(--chrome_red, #F73116); font-size: 20px; margin-bottom: 8px;`,
                    errorText: `color: var(--base_gray_080, rgba(22, 30, 38, 0.8)); font-size: 13px;`,
                    headerTitle: `font-size: 24px; font-weight: 700; color: var(--base_gray_100, #13181D); margin: 0; line-height: 1.2;`,
                    headerSubtitle: `font-size: 14px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); margin: 4px 0 0 0; line-height: 1.3;`,
                    bentoNumber: `font-size: 32px; font-weight: 700; color: var(--base_gray_100, #13181D); margin: 0; line-height: 1.1; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; letter-spacing: -0.02em;`,
                    bentoNumberLarge: `font-size: 42px; font-weight: 800; color: inherit; margin: 0; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; letter-spacing: -0.02em;`,
                    bentoNumberWarning: `font-size: 38px; font-weight: 800; color: inherit; margin: 0; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; letter-spacing: -0.02em;`,
                    bentoLabel: `font-size: 14px; font-weight: 600; color: var(--base_gray_080, rgba(22, 30, 38, 0.8)); margin: 6px 0 0 0; line-height: 1.3;`,
                    bentoLabelLarge: `font-size: 15px; font-weight: 600; color: inherit; opacity: 0.8; margin: 8px 0 0 0; line-height: 1.3;`,
                    bentoLabelWarning: `font-size: 14px; font-weight: 600; color: inherit; opacity: 0.8; margin: 6px 0 0 0; line-height: 1.3;`,
                    bentoDesc: `font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); line-height: 1.4; margin: 4px 0 0 0;`,
                    bentoDescLarge: `font-size: 13px; color: inherit; opacity: 0.7; line-height: 1.4; margin: 6px 0 0 0;`,
                    bentoDescWarning: `font-size: 12px; color: inherit; opacity: 0.7; line-height: 1.4; margin: 4px 0 0 0;`,
                    bentoTitle: `font-size: 16px; font-weight: 600; color: var(--base_gray_100, #13181D); margin: 0 0 12px 0; line-height: 1.3;`,
                    actionButton: `font-size: 13px; font-weight: 600; color: var(--theme_primary, #0F7AF5); text-decoration: none; padding: 8px 16px; border: 1px solid var(--theme_primary, #0F7AF5); border-radius: 6px; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px;`,
                    actionButtonSecondary: `font-size: 13px; font-weight: 600; color: var(--base_gray_080, rgba(22, 30, 38, 0.8)); text-decoration: none; padding: 8px 16px; border: 1px solid var(--base_gray_020, rgba(22, 46, 74, 0.2)); border-radius: 6px; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px; background: var(--bg_white_web, #FFFFFF);`
                },
                toastExtensions: {
                    custom: `background: var(--bg_white_web, #FFFFFF); color: var(--base_gray_100, #13181D); bottom: 20px; animation: slideIn 0.3s ease-out;`
                },
                layout: {
                    overlay: `position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; background: #f5f5f5;`
                }
            };
        }

        static applyStyle(element, styleKey, subKey) {
            const styles = this.getStyles();
            if (subKey) {
                element.style.cssText = styles[styleKey][subKey];
            } else {
                element.style.cssText = styles[styleKey];
            }
        }

        static addSpinnerAnimation() {
            if (!document.getElementById('attachment-spinner-style')) {
                const style = document.createElement('style');
                style.id = 'attachment-spinner-style';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        static addLayoutStyles() {
            if (!document.getElementById('attachment-layout-style')) {
                const style = document.createElement('style');
                style.id = 'attachment-layout-style';
                const layouts = this.getStyles().layouts;
                style.textContent = `
                    .attachment-floating-overlay {
                        ${layouts.floatingOverlay}
                    }
                    .attachment-floating-overlay.show {
                        opacity: 1;
                    }
                    .attachment-floating-window {
                        ${layouts.floatingWindow}
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.9);
                        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .attachment-floating-window.show {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    .attachment-window-header {
                        ${layouts.windowHeader}
                    }
                    .attachment-window-content {
                        ${layouts.windowContent}
                    }
                    .attachment-window-controls {
                        ${layouts.windowControls}
                    }
                    .attachment-window-button {
                        ${layouts.windowButton}
                    }
                    .attachment-window-button.close {
                        ${layouts.closeButton}
                    }
                    .attachment-window-button.close:hover {
                        background: #e0443e;
                        transform: scale(1.1);
                    }
                    .attachment-window-button.minimize {
                        ${layouts.minimizeButton}
                    }
                    .attachment-window-button.minimize:hover {
                        background: #dea123;
                        transform: scale(1.1);
                    }
                    .attachment-window-button.maximize {
                        ${layouts.maximizeButton}
                    }
                    .attachment-window-button.maximize:hover {
                        background: #1aab29;
                        transform: scale(1.1);
                    }
                    .attachment-floating-window.maximized {
                        top: 0 !important;
                        left: 0 !important;
                        transform: none !important;
                        width: 100% !important;
                        height: 100% !important;
                        border-radius: 0 !important;
                        max-width: none !important;
                        max-height: none !important;
                    }
                    .attachment-floating-window.minimized {
                        height: 60px !important;
                        overflow: hidden;
                    }
                    .attachment-floating-window.minimized .attachment-window-content {
                        display: none;
                    }
                    @keyframes attachmentWindowSlideIn {
                        from {
                            opacity: 0;
                            transform: translate(-50%, -60%) scale(0.8);
                        }
                        to {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1);
                        }
                    }
                    
                    /* 响应式布局 */
                    @media (max-width: 1024px) {
                        .attachment-floating-window {
                            width: 85% !important;
                            height: 95% !important;
                            min-width: 500px !important;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .attachment-floating-window {
                            width: 100% !important;
                            height: 100% !important;
                            min-width: 320px !important;
                            border-radius: 0 !important;
                            top: 0 !important;
                            left: 0 !important;
                            transform: none !important;
                        }
                        
                        /* 移动端卡片布局调整 */
                        .bento-row-responsive {
                            grid-template-columns: 1fr !important;
                            gap: 16px !important;
                        }
                        
                        .bento-stats-responsive {
                            grid-template-columns: repeat(2, 1fr) !important;
                            gap: 12px !important;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .bento-stats-responsive {
                            grid-template-columns: 1fr !important;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        static applyInteractionStyle(element, styleKey, reset = false) {
            const styles = this.getStyles();
            if (reset) {
                element.style.cssText = element.getAttribute('data-original-style') || '';
            } else {
                if (!element.getAttribute('data-original-style')) {
                    element.setAttribute('data-original-style', element.style.cssText);
                }
                if (styles.interactions && styles.interactions[styleKey]) {
                    const originalStyle = element.style.cssText;
                    element.style.cssText = originalStyle + '; ' + styles.interactions[styleKey];
                }
            }
        }
    }

    const MAIL_CONSTANTS = {
        BASE_URL: 'https://wx.mail.qq.com',
        API_ENDPOINTS: {
            MAIL_LIST: '/list/maillist',
            ATTACH_DOWNLOAD: '/attach/download',
            ATTACH_THUMBNAIL: '/attach/thumbnail',
            ATTACH_PREVIEW: '/attach/preview'
        }
    };

    class AttachmentManager {
        constructor(downloader) {
            this.downloader = downloader;
            this.isVisible = false;
            this.selectedAttachments = new Set();
            this.downloadQueue = [];
            this.downloading = false;
            this.retryCount = 3;
            this.attachments = [];
            this.filters = {
                date: 'all',
                dateRange: {
                    start: null,
                    end: null
                },
                minSize: 0,
                maxSize: 0,
                allowedTypes: [],
                excludedTypes: []
            };
            this.sortBy = {
                field: 'date',
                direction: 'desc'
            };
            this.groupBy = 'mail';
            this.isLoading = false;
            this.currentFilter = 'all';
            this.currentSort = 'date';
            
            // 面板状态管理
            this.isViewActive = false;
            this.toggleInProgress = false;
            this.currentFolderId = null;
            this.overlayPanel = null;
            this.smartDownloadButton = null;
            this.downloadProgressTimer = null;
            this.globalKeyHandler = null;
            this.buttonObserver = null;
            this.isMinimized = false;
            this.isMaximized = false;
            this.dragState = {
                isDragging: false,
                startX: 0,
                startY: 0,
                startLeft: 0,
                startTop: 0
            };
            this.totalMailCount = 0;
            this.detailData = {
                noAttachmentMails: [],
                invalidNamingAttachments: []
            };

            this.downloadSettings = {
                fileNaming: {
                    prefix: '',
                    suffix: '',
                    includeMailId: false,
                    includeAttachmentId: false,
                    includeMailSubject: false,
                    includeFileType: false,
                    separator: '_',
                    useCustomPattern: false,
                    customPattern: '{date}_{subject}_{fileName}',
                    validation: {
                        enabled: true,
                        pattern: '\\d{6,}',
                        fallbackPattern: 'auto',
                        fallbackTemplate: '{subject}_{fileName}',
                        replacementChar: '_',
                        removeInvalidChars: true
                    }
                },
                folderStructure: 'flat',
                dateFormat: 'YYYY-MM-DD',
                createDateSubfolders: false,
                folderNaming: {
                    customTemplate: '{date}/{senderName}'
                },
                conflictResolution: 'rename',
                downloadBehavior: {
                    showProgress: true,
                    retryOnFail: true,
                    verifyDownloads: true,
                    notifyOnComplete: true,
                    concurrentDownloads: 'auto',
                    autoCompareAfterDownload: true
                },
                smartGrouping: {
                    enabled: false,
                    maxGroupSize: 5,
                    groupByType: true,
                    groupByDate: true
                }
            };

            this.downloadQueue = { high: [], normal: [], low: [] };
            this.downloadStats = { startTime: null, completedSize: 0, totalSize: 0, speed: 0, lastUpdate: null };
            this.concurrentControl = { minConcurrent: 2, maxConcurrent: 5, currentConcurrent: 3, successCount: 0, failCount: 0, lastAdjustTime: null, adjustInterval: 10000 };
            this.totalTasksForProgress = 0;
            this.completedTasksForProgress = 0;
            this.autoSaveTimeout = null;
            this.currentComparisonResult = null;
            this.init();
        }


        init() {
            window.attachmentManager = this;
            this.loadSavedSettings();
            this.initUrlChangeListener();

            // 清理可能存在的旧按钮
            const existingButtons = document.querySelectorAll('#attachment-downloader-btn, [data-attachment-manager-btn="true"], .attachment-floating-btn');
            existingButtons.forEach(btn => btn.remove());

            // 延迟创建按钮，确保页面元素已加载
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => this.createAndInjectButton(), 500);
                });
            } else {
                setTimeout(() => this.createAndInjectButton(), 500);
            }
        }

        initUrlChangeListener() {
            window.addEventListener('hashchange', () => {
                const newFolderId = this.downloader.getCurrentFolderId();
                if (this.currentFolderId !== newFolderId) {
                    console.log('[URL变化] 检测到文件夹变化:', this.currentFolderId, '->', newFolderId);
                    this.currentFolderId = newFolderId;
                    
                    // 立即清理旧按钮
                    const existingButtons = document.querySelectorAll('#attachment-downloader-btn, [data-attachment-manager-btn="true"], .attachment-floating-btn');
                    existingButtons.forEach(btn => btn.remove());
                    
                    // 延迟创建按钮，等待页面更新完成
                    setTimeout(() => this.createAndInjectButton(), 500);
                    
                    // 只有在面板激活时才重新初始化，避免冲突
                    if (this.isViewActive) {
                        console.log('[URL变化] 面板处于激活状态，准备重新初始化');
                        // 添加延迟，确保页面完全加载
                        setTimeout(() => {
                            if (this.isViewActive) { // 再次检查状态
                                this.reinitializeForFolderChange();
                            }
                        }, 1000);
                    }
                }
            });
        }



        hidePanel() {
            try {
                this.hideAttachmentView();
                    } catch (error) {
            this.cleanupAttachmentManager(true);
        }
        }

        // 获取文件夹显示名称
        getFolderDisplayName() {
            // 获取文件夹名称
            const nativeFolderName = document.querySelector('.toolbar-folder-name');
            if (nativeFolderName && nativeFolderName.textContent.trim()) {
                return nativeFolderName.textContent.trim();
            }

        }


    // 显示设置对话框
    async showSettingsDialog() {
        const dialog = this.createUI('div', {
            styles: StyleManager.getStyles().dialogs.settingsOverlay,
            content: `
                <div style="${StyleManager.getStyles().dialogs.settingsContent}">
                    <div style="${StyleManager.getStyles().dialogs.settingsTitle}">
                        <span>下载设置</span>
                        <button id="settings-close-x" style="position: absolute; right: 24px; top: 24px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;">×</button>
                    </div>
                    
                    <!-- 选项卡导航 -->
                    <div style="display: flex; border-bottom: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); margin: 0 -32px; padding: 0 32px; margin-top: 20px;">
                        <div class="settings-tab active" data-tab="basic" style="padding: 12px 24px; cursor: pointer; border-bottom: 2px solid var(--theme_primary, #0F7AF5); color: var(--theme_primary, #0F7AF5); font-weight: 600; transition: all 0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                            基础设置
                        </div>
                        <div class="settings-tab" data-tab="advanced" style="padding: 12px 24px; cursor: pointer; color: var(--base_gray_070, rgba(22, 30, 38, 0.7)); transition: all 0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                            高级设置
                        </div>
                        <div class="settings-tab" data-tab="download" style="padding: 12px 24px; cursor: pointer; color: var(--base_gray_070, rgba(22, 30, 38, 0.7)); transition: all 0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            下载设置
                        </div>
                        <div class="settings-tab" data-tab="filter" style="padding: 12px 24px; cursor: pointer; color: var(--base_gray_070, rgba(22, 30, 38, 0.7)); transition: all 0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                            </svg>
                            过滤规则
                        </div>
                    </div>
                    
                    <!-- 选项卡内容区域 -->
                    <div style="margin-top: 24px; max-height: calc(80vh - 200px); overflow-y: auto; padding-right: 8px;">
                        <!-- 基础设置面板 -->
                        <div id="settings-panel-basic" class="settings-panel" style="display: block;">
                            <div style="${StyleManager.getStyles().dialogs.settingsSection}">
                                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme_primary, #0F7AF5)" stroke-width="2" style="margin-right: 12px;">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    <div style="${StyleManager.getStyles().dialogs.settingsSectionTitle}; margin-bottom: 0;">文件命名</div>
                                </div>
                        
                                <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                    <label style="${StyleManager.getStyles().dialogs.settingsLabel}">命名模式</label>
                                    <select id="naming-mode" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                        <option value="original">原始文件名</option>
                                        <option value="custom">自定义文件名</option>
                                    </select>
                                </div>
                                
                                <div id="custom-naming-options" style="display: none; background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); padding: 16px; border-radius: 8px; margin-top: 12px;">
                                    <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">命名模板</label>
                                        <div style="position: relative;">
                                            <input type="text" id="naming-pattern" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                                   placeholder="{date}_{subject}_{fileName}" value="{date}_{subject}_{fileName}">
                                            <button type="button" id="show-variables-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: var(--theme_primary, #0F7AF5); color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 500;">选择变量</button>
                                        </div>
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">
                                            使用变量构建自定义文件名，点击按钮查看所有可用变量
                                        </div>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsRow}; margin-top: 16px;">
                                        <div>
                                            <label style="${StyleManager.getStyles().dialogs.settingsLabel}">前缀</label>
                                            <input type="text" id="naming-prefix" style="${StyleManager.getStyles().dialogs.settingsInput}" placeholder="可选前缀">
                                        </div>
                                        <div>
                                            <label style="${StyleManager.getStyles().dialogs.settingsLabel}">后缀</label>
                                            <input type="text" id="naming-suffix" style="${StyleManager.getStyles().dialogs.settingsInput}" placeholder="可选后缀">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 文件夹结构 -->
                            <div style="${StyleManager.getStyles().dialogs.settingsSection}">
                                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme_primary, #0F7AF5)" stroke-width="2" style="margin-right: 12px;">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    <div style="${StyleManager.getStyles().dialogs.settingsSectionTitle}; margin-bottom: 0;">文件夹结构</div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                    <label style="${StyleManager.getStyles().dialogs.settingsLabel}">组织方式</label>
                                    <select id="folder-structure" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                        <option value="flat" selected>平铺（所有文件在同一文件夹）</option>
                                        <option value="subject">主题</option>
                                        <option value="sender">发件人</option>
                                        <option value="date">日期</option>
                                        <option value="custom">自定义文件夹结构</option>
                                    </select>
                                </div>
                                
                                <!-- 自定义文件夹结构配置 -->
                                <div id="folder-naming-options" style="display: none; background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); padding: 16px; border-radius: 8px; margin-top: 12px;">
                                    <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">文件夹结构模板</label>
                                        <div style="position: relative;">
                                            <input type="text" id="folder-custom-template" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                                   placeholder="{date:YYYY-MM}/{senderName}" value="{date:YYYY-MM}/{senderName}">
                                            <button type="button" id="show-folder-custom-variables-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: var(--theme_primary, #0F7AF5); color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 500;">选择变量</button>
                                        </div>
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">
                                            使用"/"分隔创建多级文件夹。常用模板：<br>
                                            • {date}/{senderName} - 按日期和发件人<br>
                                            • {subject}/{fileType} - 按主题和文件类型<br>
                                            • {senderName}/{date} - 按发件人和日期
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                    <input type="checkbox" id="smart-grouping" style="${StyleManager.getStyles().dialogs.settingsCheckbox}">
                                    <label for="smart-grouping" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">启用智能分组</label>
                                </div>
                                <div style="${StyleManager.getStyles().dialogs.settingsDescription}">根据文件名模式自动分组相关文件</div>
                            </div>
                        </div>

                        <!-- 高级设置面板 -->
                        <div id="settings-panel-advanced" class="settings-panel" style="display: none;">
                            <!-- 文件名规范检查 -->
                            <div style="${StyleManager.getStyles().dialogs.settingsSection}">
                                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme_primary, #0F7AF5)" stroke-width="2" style="margin-right: 12px;">
                                        <path d="M9 11l3 3L22 4"/>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                    </svg>
                                    <div style="${StyleManager.getStyles().dialogs.settingsSectionTitle}; margin-bottom: 0;">命名规则验证</div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                    <label style="${StyleManager.getStyles().dialogs.settingsLabel}">启用验证</label>
                                    <select id="filename-validation" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                        <option value="enabled">启用</option>
                                        <option value="disabled">禁用</option>
                                    </select>
                                    <div style="${StyleManager.getStyles().dialogs.settingsDescription}">使用正则表达式检查文件名是否符合规范</div>
                                </div>
                        
                                <div id="filename-validation-options" style="display: block; background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); padding: 16px; border-radius: 8px; margin-top: 12px;">
                                    <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">验证正则表达式</label>
                                        <input type="text" id="validation-pattern" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                               placeholder="\\d{6,}" value="\\d{6,}">
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">
                                            用于验证文件名的正则表达式。例如：\\d{6,} 表示至少6位数字
                                        </div>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">不符合规则时的处理</label>
                                        <select id="fallback-pattern" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                            <option value="auto" selected>自动分析</option>
                                            <option value="mailSubject">添加邮件主题</option>
                                            <option value="senderEmail">添加发件人邮箱</option>
                                            <option value="toTime">添加时间戳</option>
                                            <option value="customTemplate">自定义模板</option>
                                        </select>
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">当文件名不符合验证规则时的处理方式</div>
                                    </div>
                                    
                                    <div id="fallback-template-container" style="${StyleManager.getStyles().dialogs.settingsItem}; display: none;">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">备用命名模板</label>
                                        <div style="position: relative;">
                                            <input type="text" id="fallback-template" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                                   placeholder="{date}_{subject}_{fileName}" value="{subject}_{fileName}">
                                            <button type="button" id="show-fallback-variables-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: var(--theme_primary, #0F7AF5); color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 500;">选择变量</button>
                                        </div>
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">
                                            不符合规则时使用的命名模板
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 内容替换 -->
                            <div style="${StyleManager.getStyles().dialogs.settingsSection}">
                                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme_primary, #0F7AF5)" stroke-width="2" style="margin-right: 12px;">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                    </svg>
                                    <div style="${StyleManager.getStyles().dialogs.settingsSectionTitle}; margin-bottom: 0;">内容替换</div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                    <input type="checkbox" id="enable-content-replacement" style="${StyleManager.getStyles().dialogs.settingsCheckbox}">
                                    <label for="enable-content-replacement" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">启用内容替换</label>
                                </div>
                                <div style="${StyleManager.getStyles().dialogs.settingsDescription}">对文件名进行自定义内容替换，支持字符串和正则表达式</div>
                            
                                <div id="content-replacement-options" style="display: none; background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); padding: 16px; border-radius: 8px; margin-top: 12px;">
                                    <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">匹配模式</label>
                                        <select id="replacement-mode" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                            <option value="string" selected>字符串匹配</option>
                                            <option value="regex">正则表达式</option>
                                        </select>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">查找内容</label>
                                        <input type="text" id="replacement-search" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                               placeholder="要替换的内容或正则表达式">
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">
                                            字符串模式：直接输入要替换的文字 | 正则模式：如 \\d{4} 匹配4位数字
                                        </div>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">替换内容</label>
                                        <div style="position: relative;">
                                            <input type="text" id="replacement-replace" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                                   placeholder="替换后的内容，支持变量">
                                            <button type="button" id="show-replacement-variables-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: var(--theme_primary, #0F7AF5); color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-weight: 500;">选择变量</button>
                                        </div>
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">
                                            支持变量如 {subject}、{date} 等，正则模式还支持捕获组 $1、$2
                                        </div>
                                    </div>
                                    
                                    <div style="display: flex; gap: 24px; margin-top: 12px;">
                                        <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                            <input type="checkbox" id="replacement-global" style="${StyleManager.getStyles().dialogs.settingsCheckbox}" checked>
                                            <label for="replacement-global" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">全局替换</label>
                                        </div>
                                        
                                        <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                            <input type="checkbox" id="replacement-case-sensitive" style="${StyleManager.getStyles().dialogs.settingsCheckbox}">
                                            <label for="replacement-case-sensitive" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">区分大小写</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 文件名字符处理 -->
                            <div style="${StyleManager.getStyles().dialogs.settingsSection}">
                                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme_primary, #0F7AF5)" stroke-width="2" style="margin-right: 12px;">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                    <div style="${StyleManager.getStyles().dialogs.settingsSectionTitle}; margin-bottom: 0;">字符处理</div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                    <label style="${StyleManager.getStyles().dialogs.settingsLabel}">无效字符处理方式</label>
                                    <div style="${StyleManager.getStyles().dialogs.settingsRow}">
                                        <div style="flex: 1;">
                                            <select id="invalid-char-handling" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                                <option value="replace" selected>替换无效字符</option>
                                                <option value="remove">移除无效字符</option>
                                                <option value="keep">保留原字符</option>
                                            </select>
                                        </div>
                                        <div style="flex: 0 0 120px; margin-left: 10px;">
                                            <input type="text" id="invalid-char-replacement" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                                   value="_" placeholder="_" maxlength="3">
                                        </div>
                                    </div>
                                    <div style="${StyleManager.getStyles().dialogs.settingsDescription}">
                                        自动处理系统不允许的文件名字符（如 &lt; &gt; : " | ? * 等）
                                    </div>
                                </div>
                            </div>
                        </div>

                    
                        <!-- 下载设置面板 -->
                        <div id="settings-panel-download" class="settings-panel" style="display: none;">
                            <!-- 下载行为 -->
                            <div style="${StyleManager.getStyles().dialogs.settingsSection}">
                                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme_primary, #0F7AF5)" stroke-width="2" style="margin-right: 12px;">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    <div style="${StyleManager.getStyles().dialogs.settingsSectionTitle}; margin-bottom: 0;">下载行为</div>
                                </div>
                        
                                <div style="${StyleManager.getStyles().dialogs.settingsRow}">
                                    <div>
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">并发下载数</label>
                                        <select id="concurrent-downloads" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                            <option value="auto" selected>自动调节 (推荐)</option>
                                            <option value="1">1个文件</option>
                                            <option value="2">2个文件</option>
                                            <option value="3">3个文件</option>
                                            <option value="5">5个文件</option>
                                        </select>
                                        <div style="${StyleManager.getStyles().dialogs.settingsDescription}">自动调节模式会根据下载成功率动态调整并发数（2-5个文件），提供最佳下载性能</div>
                                    </div>
                                    <div>
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">冲突处理</label>
                                        <select id="conflict-resolution" style="${StyleManager.getStyles().dialogs.settingsSelect}">
                                            <option value="rename" selected>自动重命名</option>
                                            <option value="skip">跳过已存在</option>
                                            <option value="overwrite">覆盖文件</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
                                    <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                        <input type="checkbox" id="show-progress" style="${StyleManager.getStyles().dialogs.settingsCheckbox}" checked>
                                        <label for="show-progress" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">显示下载进度</label>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                        <input type="checkbox" id="retry-on-fail" style="${StyleManager.getStyles().dialogs.settingsCheckbox}" checked>
                                        <label for="retry-on-fail" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">失败时自动重试</label>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                        <input type="checkbox" id="verify-downloads" style="${StyleManager.getStyles().dialogs.settingsCheckbox}" checked>
                                        <label for="verify-downloads" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">验证下载完整性</label>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                        <input type="checkbox" id="notify-complete" style="${StyleManager.getStyles().dialogs.settingsCheckbox}" checked>
                                        <label for="notify-complete" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">完成时通知</label>
                                    </div>
                                    
                                    <div style="${StyleManager.getStyles().dialogs.settingsCheckboxItem}">
                                        <input type="checkbox" id="auto-compare" style="${StyleManager.getStyles().dialogs.settingsCheckbox}" checked>
                                        <label for="auto-compare" style="${StyleManager.getStyles().dialogs.settingsLabel}; margin-bottom: 0;">下载完成后自动对比本地</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    
                        <!-- 过滤规则面板 -->
                        <div id="settings-panel-filter" class="settings-panel" style="display: none;">
                            <div style="${StyleManager.getStyles().dialogs.settingsSection}">
                                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme_primary, #0F7AF5)" stroke-width="2" style="margin-right: 12px;">
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                    </svg>
                                    <div style="${StyleManager.getStyles().dialogs.settingsSectionTitle}; margin-bottom: 0;">文件过滤</div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsRow}">
                                    <div>
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">最小文件大小 (KB)</label>
                                        <input type="number" id="min-file-size" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                               placeholder="0" min="0">
                                    </div>
                                    <div>
                                        <label style="${StyleManager.getStyles().dialogs.settingsLabel}">最大文件大小 (MB)</label>
                                        <input type="number" id="max-file-size" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                               placeholder="无限制" min="0">
                                    </div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                    <label style="${StyleManager.getStyles().dialogs.settingsLabel}">允许的文件类型</label>
                                    <input type="text" id="allowed-types" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                           placeholder="jpg,png,pdf,doc,zip (留空表示允许所有类型)">
                                    <div style="${StyleManager.getStyles().dialogs.settingsDescription}">用逗号分隔多个文件扩展名，留空表示允许所有类型</div>
                                </div>
                                
                                <div style="${StyleManager.getStyles().dialogs.settingsItem}">
                                    <label style="${StyleManager.getStyles().dialogs.settingsLabel}">排除的文件类型</label>
                                    <input type="text" id="excluded-types" style="${StyleManager.getStyles().dialogs.settingsInput}" 
                                           placeholder="tmp,log,cache">
                                    <div style="${StyleManager.getStyles().dialogs.settingsDescription}">用逗号分隔多个文件扩展名</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 按钮组 -->
                    <div style="${StyleManager.getStyles().dialogs.settingsButtonGroup}">
                        <button id="settings-reset" style="${StyleManager.getStyles().texts.actionButtonSecondary}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                            </svg>
                            重置默认
                        </button>
                        <button id="settings-save" style="${StyleManager.getStyles().texts.actionButton}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            保存设置
                        </button>
                    </div>
                </div>
            `,
            events: {
                click: (e) => {
                    if (e.target === dialog) {
                        document.body.removeChild(dialog);
                    } else if (e.target.id === 'settings-close-x' || e.target.closest('#settings-close-x')) {
                        // 更新文件夹结构预览（如果当前有附件数据）
                        if (this.attachments && this.attachments.length > 0) {
                            this.updateFolderStructurePreview(this.attachments);
                        }
                        document.body.removeChild(dialog);
                    } else if (e.target.id === 'settings-save' || e.target.closest('#settings-save')) {
                        this.saveSettings(dialog);
                        document.body.removeChild(dialog);
                    } else if (e.target.id === 'settings-reset' || e.target.closest('#settings-reset')) {
                        this.resetSettings(dialog);
                    } else if (e.target.classList.contains('settings-tab')) {
                        this.switchSettingsTab(e.target.dataset.tab);
                    }
                }
            }
        });
        
        document.body.appendChild(dialog);
        
        // 添加事件监听器（避免CSP限制）
        const namingModeSelect = dialog.querySelector('#naming-mode');
        const fallbackPatternSelect = dialog.querySelector('#fallback-pattern');
        const showVariablesBtn = dialog.querySelector('#show-variables-btn');
        const showFallbackVariablesBtn = dialog.querySelector('#show-fallback-variables-btn');
        const filenameValidationSelect = dialog.querySelector('#filename-validation');
        
        if (namingModeSelect) {
            namingModeSelect.addEventListener('change', () => {

                if (window.toggleNamingOptions) {
                    window.toggleNamingOptions();
                }
            });

        }
        
        if (fallbackPatternSelect) {
            fallbackPatternSelect.addEventListener('change', () => {

                if (window.toggleFallbackTemplate) {
                    window.toggleFallbackTemplate();
                }
            });

        }
        
        if (showVariablesBtn) {
            showVariablesBtn.addEventListener('click', () => {

                this.showVariableSelector('naming-pattern');
            });

        }
        
        if (showFallbackVariablesBtn) {
            showFallbackVariablesBtn.addEventListener('click', () => {

                this.showVariableSelector('fallback-template');
            });

        }
        
        if (filenameValidationSelect) {
            filenameValidationSelect.addEventListener('change', () => {

                if (window.toggleFilenameValidationOptions) {
                    window.toggleFilenameValidationOptions();
                }
            });

        }
        
        const charHandlingSelect = dialog.querySelector('#invalid-char-handling');
        if (charHandlingSelect) {
            charHandlingSelect.addEventListener('change', () => {
                if (window.toggleCharHandlingInput) {
                    window.toggleCharHandlingInput();
                }
            });
        }
        
        const enableContentReplacementCheckbox = dialog.querySelector('#enable-content-replacement');
        if (enableContentReplacementCheckbox) {
            enableContentReplacementCheckbox.addEventListener('change', () => {
                if (window.toggleContentReplacementOptions) {
                    window.toggleContentReplacementOptions();
                }
            });
        }
        
        const showReplacementVariablesBtn = dialog.querySelector('#show-replacement-variables-btn');
        if (showReplacementVariablesBtn) {
            showReplacementVariablesBtn.addEventListener('click', () => {
                this.showVariableSelector('replacement-replace');
            });
        }
        
        // 定义全局函数
        window.toggleFallbackTemplate = () => {
            // 使用document.querySelector而不是dialog.querySelector
            const fallbackPattern = document.querySelector('#fallback-pattern').value;
            const templateContainer = document.querySelector('#fallback-template-container');
            
            if (fallbackPattern === 'customTemplate') {
                templateContainer.style.display = 'block';
            } else {
                templateContainer.style.display = 'none';
            }
        };
        
        window.toggleFilenameValidationOptions = () => {
            const filenameValidation = document.querySelector('#filename-validation');
            const validationOptions = document.querySelector('#filename-validation-options');
            
            if (filenameValidation && validationOptions) {
                if (filenameValidation.value === 'enabled') {
                    validationOptions.style.display = 'block';
                } else {
                    validationOptions.style.display = 'none';
                }
            }
        };
        
        window.toggleCharHandlingInput = () => {
            const charHandling = document.querySelector('#invalid-char-handling');
            const replacementInput = document.querySelector('#invalid-char-replacement');
            
            if (charHandling && replacementInput) {
                if (charHandling.value === 'replace') {
                    replacementInput.style.display = 'block';
                    replacementInput.disabled = false;
                } else {
                    replacementInput.style.display = 'none';
                    replacementInput.disabled = true;
                }
            }
        };
        
        window.toggleContentReplacementOptions = () => {
            const enableContentReplacement = document.querySelector('#enable-content-replacement');
            const optionsContainer = document.querySelector('#content-replacement-options');
            
            if (enableContentReplacement && optionsContainer) {
                if (enableContentReplacement.checked) {
                    optionsContainer.style.display = 'block';
                } else {
                    optionsContainer.style.display = 'none';
                }
            }
        };
        
        window.toggleNamingOptions = () => {

            
            // 使用document.querySelector而不是dialog.querySelector
            const namingMode = document.querySelector('#naming-mode');
            const customOptions = document.querySelector('#custom-naming-options');
            

            
            if (namingMode && customOptions) {
                const mode = namingMode.value;

                
                // 记录修改前的状态
                const beforeStyle = window.getComputedStyle(customOptions);

                
                if (mode === 'custom') {
                    customOptions.style.display = 'block';
                    customOptions.style.visibility = 'visible';
                    customOptions.style.opacity = '1';
                    customOptions.style.height = 'auto';
                    customOptions.style.overflow = 'visible';

                } else {
                    customOptions.style.display = 'none';
                    customOptions.style.visibility = 'hidden';
                    customOptions.style.opacity = '0';

                }
                
                // 强制重绘
                customOptions.offsetHeight;
                
                // 验证结果
                setTimeout(() => {
                    const afterStyle = window.getComputedStyle(customOptions);

                    
                    if (mode === 'custom' && afterStyle.display === 'block') {

                    } else if (mode === 'original' && afterStyle.display === 'none') {

                    } else {
                        console.error('❌ 状态验证失败！', {
                            期望模式: mode,
                            实际display: afterStyle.display,
                            期望display: mode === 'custom' ? 'block' : 'none'
                        });
                    }
                }, 10);
                
            } else {
                console.error('❌ 错误：找不到元素', { 
                    namingMode: namingMode ? '找到' : '未找到',
                    customOptions: customOptions ? '找到' : '未找到',
                    allElements: document.querySelectorAll('[id]').length + '个带ID的元素'
                });
                
                // 列出所有带ID的元素用于调试
                const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);

            }
        };
        
        // 加载当前设置
        this.loadSettings(dialog);
        
        // 设置文件夹结构事件
        this.setupFolderStructureEvents(dialog);
        
        // 添加自动保存功能
        this.setupAutoSave(dialog);
        
        // 添加选项卡切换样式
        this.addSettingsTabStyles();
    }

    // 切换设置选项卡
    switchSettingsTab(tabName) {
        // 切换选项卡激活状态
        document.querySelectorAll('.settings-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
                tab.style.borderBottom = '2px solid var(--theme_primary, #0F7AF5)';
                tab.style.color = 'var(--theme_primary, #0F7AF5)';
                tab.style.fontWeight = '600';
            } else {
                tab.classList.remove('active');
                tab.style.borderBottom = 'none';
                tab.style.color = 'var(--base_gray_070, rgba(22, 30, 38, 0.7))';
                tab.style.fontWeight = 'normal';
            }
        });
        
        // 切换面板显示
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        const activePanel = document.getElementById(`settings-panel-${tabName}`);
        if (activePanel) {
            activePanel.style.display = 'block';
        }
    }

    // 添加选项卡样式
    addSettingsTabStyles() {
        if (document.getElementById('settings-tab-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'settings-tab-styles';
        style.textContent = `
            .settings-tab {
                position: relative;
                user-select: none;
            }
            .settings-tab:hover:not(.active) {
                color: var(--theme_primary, #0F7AF5) !important;
                background: var(--base_gray_005, rgba(20, 46, 77, 0.05));
            }
            .settings-tab:active {
                transform: translateY(1px);
            }
            .settings-tab svg {
                transition: transform 0.2s;
            }
            .settings-tab:hover svg {
                transform: scale(1.1);
            }
            #settings-close-x:hover {
                background: var(--base_gray_005, rgba(20, 46, 77, 0.05));
                color: var(--base_gray_100, #13181D);
            }
            .settings-panel {
                animation: fadeIn 0.3s ease-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    loadSettings(dialog) {

        const settings = this.downloadSettings;
        
        // 文件命名设置
        const namingModeValue = settings.fileNaming.useCustomPattern ? 'custom' : 'original';

        dialog.querySelector('#naming-mode').value = namingModeValue;
        dialog.querySelector('#naming-prefix').value = settings.fileNaming.prefix || '';
        dialog.querySelector('#naming-suffix').value = settings.fileNaming.suffix || '';
        dialog.querySelector('#naming-pattern').value = settings.fileNaming.customPattern || '{date}_{subject}_{fileName}';
        
        // 文件名规范检查设置
        dialog.querySelector('#filename-validation').value = settings.fileNaming.validation?.enabled !== false ? 'enabled' : 'disabled';
        dialog.querySelector('#validation-pattern').value = settings.fileNaming.validation?.pattern || '\\d{6,}';
        dialog.querySelector('#fallback-pattern').value = settings.fileNaming.validation?.fallbackPattern || 'auto';
        dialog.querySelector('#fallback-template').value = settings.fileNaming.validation?.fallbackTemplate || '{subject}_{fileName}';
        
        // 内容替换设置
        const contentReplacement = settings.fileNaming.validation?.contentReplacement;
        dialog.querySelector('#enable-content-replacement').checked = contentReplacement?.enabled || false;
        dialog.querySelector('#replacement-mode').value = contentReplacement?.mode || 'string';
        dialog.querySelector('#replacement-search').value = contentReplacement?.search || '';
        dialog.querySelector('#replacement-replace').value = contentReplacement?.replace || '';
        dialog.querySelector('#replacement-global').checked = contentReplacement?.global !== false;
        dialog.querySelector('#replacement-case-sensitive').checked = contentReplacement?.caseSensitive || false;
        
        // 文件名字符处理设置
        const removeInvalidChars = settings.fileNaming.validation?.removeInvalidChars !== false;
        const replacementChar = settings.fileNaming.validation?.replacementChar || '_';
        
        if (removeInvalidChars && replacementChar) {
            dialog.querySelector('#invalid-char-handling').value = 'replace';
        } else if (removeInvalidChars && !replacementChar) {
            dialog.querySelector('#invalid-char-handling').value = 'remove';
        } else {
            dialog.querySelector('#invalid-char-handling').value = 'keep';
        }
        dialog.querySelector('#invalid-char-replacement').value = replacementChar;
        
        // 文件夹结构设置
        dialog.querySelector('#folder-structure').value = settings.folderStructure || 'flat';
        dialog.querySelector('#smart-grouping').checked = settings.smartGrouping?.enabled || false;
        
        // 自定义文件夹模板设置
        const folderNaming = settings.folderNaming || {};
        dialog.querySelector('#folder-custom-template').value = folderNaming.customTemplate || '{date:YYYY-MM}/{senderName}';
        
        // 下载行为设置
        dialog.querySelector('#concurrent-downloads').value = settings.downloadBehavior?.concurrentDownloads || 'auto';
        dialog.querySelector('#conflict-resolution').value = settings.conflictResolution || 'rename';
        dialog.querySelector('#show-progress').checked = settings.downloadBehavior?.showProgress !== false;
        dialog.querySelector('#retry-on-fail').checked = settings.downloadBehavior?.retryOnFail !== false;
        dialog.querySelector('#verify-downloads').checked = settings.downloadBehavior?.verifyDownloads !== false;
        dialog.querySelector('#notify-complete').checked = settings.downloadBehavior?.notifyOnComplete !== false;
        dialog.querySelector('#auto-compare').checked = settings.downloadBehavior?.autoCompareAfterDownload !== false;
        
        // 过滤设置
        dialog.querySelector('#min-file-size').value = this.filters?.minSize || '';
        dialog.querySelector('#max-file-size').value = this.filters?.maxSize ? this.filters.maxSize / (1024 * 1024) : '';
        dialog.querySelector('#allowed-types').value = this.filters?.allowedTypes?.join(',') || '';
        dialog.querySelector('#excluded-types').value = this.filters?.excludedTypes?.join(',') || '';
        
        // 手动触发显示状态更新（因为程序设置value不会触发onchange事件）
        setTimeout(() => {
            if (window.toggleNamingOptions) {
                window.toggleNamingOptions();
            }

            if (window.toggleFallbackTemplate) {
                window.toggleFallbackTemplate();
            }
            
            if (window.toggleFilenameValidationOptions) {
                window.toggleFilenameValidationOptions();
            }
            
            if (window.toggleCharHandlingInput) {
                window.toggleCharHandlingInput();
            }
            
            if (window.toggleContentReplacementOptions) {
                window.toggleContentReplacementOptions();
            }
        }, 50);
    }

    setupFolderStructureEvents(dialog) {
        const folderStructureSelect = dialog.querySelector('#folder-structure');
        const folderNamingOptions = dialog.querySelector('#folder-naming-options');
        
        if (!folderStructureSelect || !folderNamingOptions) return;
        
        // 显示/隐藏文件夹命名选项
        const toggleFolderNamingOptions = () => {
            const selectedValue = folderStructureSelect.value;
            const shouldShow = selectedValue === 'custom';
            folderNamingOptions.style.display = shouldShow ? 'block' : 'none';
        };
        
        // 初始化显示状态
        toggleFolderNamingOptions();
        
        // 监听选择器变化
        folderStructureSelect.addEventListener('change', toggleFolderNamingOptions);
        
        // 为自定义文件夹模板按钮添加事件监听器
        const customVariableBtn = dialog.querySelector('#show-folder-custom-variables-btn');
        if (customVariableBtn) {
            customVariableBtn.addEventListener('click', () => {
                this.showVariableSelector('folder-custom-template');
            });
        }
    }

    setupAutoSave(dialog) {
        // 获取所有需要监听的表单元素
        const formElements = dialog.querySelectorAll('input, select, textarea');
        
        // 为每个表单元素添加自动保存监听器
        formElements.forEach(element => {
            const eventType = element.type === 'checkbox' ? 'change' : 
                             element.tagName === 'SELECT' ? 'change' : 'input';
            
            element.addEventListener(eventType, () => {
                // 延迟保存，避免频繁保存
                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    this.saveSettings(dialog);
                    this.showToast('设置已自动保存', 'success', 1500);
                }, 500);
            });
        });
    }

    showVariableSelector(targetInputId) {
        // 定义可用变量，按类别分组
        const variableGroups = [
            {
                title: '✉️ 邮件信息',
                variables: [
                    { key: '{subject}', name: '邮件主题', description: '邮件的主题内容', example: '重要文件' },
                    { key: '{sender}', name: '发件人', description: '发件人姓名', example: '张三' },
                    { key: '{senderEmail}', name: '发件人邮箱', description: '发件人邮箱地址', example: '134657980@qq.com' },
                    { key: '{senderName}', name: '发件人名称', description: '发件人显示名称', example: '张三' },
                    { key: '{mailIndex}', name: '邮件编号', description: '邮件在文件夹中的编号（根据总数动态补零，最少2位）', example: '0001' },
                    { key: '{mailId}', name: '邮件ID', description: '邮件唯一标识符', example: 'ZL0012_wnrNBwSMZGQu72gAZv4Zkf6' }
                ]
            },
            {
                title: '📁 文件夹信息',
                variables: [
                    { key: '{folderName}', name: '文件夹名称', description: '当前文件夹的名称', example: '我的文件夹' },
                    { key: '{folderID}', name: '文件夹ID', description: '当前文件夹的ID', example: '2001' }
                ]
            },
            {
                title: '📎 附件信息',
                variables: [
                    { key: '{fileName}', name: '完整文件名', description: '附件的原始文件名', example: '报告.pdf' },
                    { key: '{fileNameNoExt}', name: '文件名', description: '不含扩展名的文件名', example: '报告' },
                    { key: '{fileType}', name: '文件扩展名', description: '文件的扩展名', example: 'pdf' },
                    { key: '{size}', name: '文件大小', description: '文件大小 (字节)', example: '1024' },
                                    { key: '{fileIndex}', name: '附件编号', description: '附件在文件夹中的编号（根据总数动态补零，最少2位）', example: '0001' },
                { key: '{attachIndex}', name: '邮件内序号', description: '附件在本邮件中的序号（根据总数动态补零，最少2位）', example: '01' },
                    { key: '{fileId}', name: '附件ID', description: '附件的唯一标识符', example: 'ZF0012_wnrNBwSMZGQu72gAYvkZSf6' }
                ]
            },
            {
                title: '📅 常用日期时间',
                variables: [
                    { key: '{date}', name: '标准日期', description: '邮件日期 (YYYY-MM-DD)', example: '2024-01-15' },
                    { key: '{time}', name: '标准时间', description: '邮件时间 (HH-mm-ss)', example: '14-30-25' },
                    { key: '{datetime}', name: '日期时间', description: '完整日期时间', example: '2024-01-15_14-30-25' },
                    { key: '{timestamp}', name: '时间戳', description: 'Unix时间戳 (秒)', example: '1705312225' },
                    { key: '{year}', name: '年份', description: '四位年份 (2024)', example: '2024' },
                    { key: '{month}', name: '月份', description: '两位月份 (01-12)', example: '01' },
                    { key: '{day}', name: '日期', description: '两位日期 (01-31)', example: '15' }
                ]
            },
            {
                title: '🔧 自定义日期格式',
                variables: [
                    { key: '{date:YYYY-MM-DD}', name: '完整日期', description: '年-月-日 (2024-01-15)', example: '2024-01-15' },
                    { key: '{date:YYYY-MM}', name: '年月', description: '年-月 (2024-01)', example: '2024-01' },
                    { key: '{date:MM-DD}', name: '月日', description: '月-日 (01-15)', example: '01-15' },
                    { key: '{date:YYYY}', name: '年份', description: '四位年份 (2024)', example: '2024' },
                    { key: '{date:MM}', name: '月份', description: '两位月份 (01)', example: '01' },
                    { key: '{date:DD}', name: '日期', description: '两位日期 (15)', example: '15' },
                    { key: '{date:HH-mm-ss}', name: '完整时间', description: '时-分-秒 (14-30-25)', example: '14-30-25' },
                    { key: '{date:HH-mm}', name: '时分', description: '时-分 (14-30)', example: '14-30' },
                    { key: '{date:HH}', name: '24小时制', description: '24小时制 (14)', example: '14' },
                    { key: '{date:hh}', name: '12小时制', description: '12小时制 (02)', example: '02' },
                    { key: '{date:mm}', name: '分钟', description: '分钟 (30)', example: '30' },
                    { key: '{date:ss}', name: '秒数', description: '秒数 (25)', example: '25' }
                ]
            },
            {
                title: '🌐 中文时间',
                variables: [
                    { key: '{weekday}', name: '星期', description: '中文星期 (星期一)', example: '星期一' },
                    { key: '{weekdayName}', name: '周', description: '简写星期 (周一)', example: '周一' },
                    { key: '{monthName}', name: '月份', description: '中文月份 (一月)', example: '一月' },
                    { key: '{ampm}', name: '上下午', description: '中文上下午', example: '下午' },
                    { key: '{AMPM}', name: 'AM/PM', description: '英文AM/PM', example: 'PM' }
                ]
            }
        ];

        // 创建弹出层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 1000px;
            max-height: 100vh;
            box-shadow: 0 12px 48px rgba(0,0,0,0.25);
            position: relative;
            animation: slideIn 0.3s ease-out;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // 确保变量选择器样式已添加
        this.ensureVariableSelectorStyles();

        popup.innerHTML = `
            <!-- 弹窗头部 -->
            <div class="popup-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 2px;">变量选择器</div>
                        <div style="color: #666; font-size: 13px;">点击变量插入到模板中</div>
                    </div>
                    <button id="close-variable-selector" style="background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: #666; font-size: 16px; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
            </div>
            
            <!-- 模板编辑区域 -->
            <div class="template-section">
                <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px;">模板编辑</label>
                <div style="position: relative;">
                    <input type="text" id="template-preview" style="width: 100%; padding: 10px 80px 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; font-family: monospace; background: white; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <button id="apply-template" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: #007bff; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500;">应用</button>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #666;">
                    <span style="color: #999;">预览：</span>
                    <span id="template-preview-example" style="font-family: monospace; color: #333; background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">请输入模板</span>
                </div>
                <div id="filename-length-warning" style="margin-top: 4px; font-size: 11px; display: none;"></div>
            </div>
            
            <!-- 变量选择区域 -->
            <div class="variables-section">
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">可用变量</div>
                    <div style="font-size: 12px; color: #666;">点击任意变量插入到模板中，模板不包含最终文件扩展名</div>
                </div>
                <div id="variables-container">
                    ${variableGroups.map(group => `
                        <div class="variable-group">
                            <div class="variable-group-title">${group.title}</div>
                            <div class="variables-grid">
                                ${group.variables.map(variable => `
                                    <div class="variable-item" data-variable="${variable.key}">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px;">
                                            <span class="variable-key">${variable.key}</span>
                                            <span class="variable-name">${variable.name}</span>
                                        </div>
                                        <div class="variable-desc">${variable.description}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 快捷操作区域 -->
            <div class="popup-footer">
                <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    <button id="clear-template" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer; font-size: 12px; color: #666; font-weight: 500;">清空模板</button>
                    <button id="insert-common-pattern" style="padding: 8px 16px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">常用模式</button>
                    <button id="insert-detailed-pattern" style="padding: 8px 16px; border: 1px solid #28a745; background: #28a745; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">详细模式</button>
                </div>
            </div>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // 添加事件监听器
        const targetInput = document.querySelector(`#${targetInputId}`);
        const templatePreview = popup.querySelector('#template-preview');
        const previewExample = popup.querySelector('#template-preview-example');
        
        // 更新预览示例
        const updatePreviewExample = () => {
            if (previewExample && templatePreview) {
                const template = templatePreview.value;
                if (!template || template.trim() === '') {
                    previewExample.textContent = '请输入模板';
                    previewExample.title = '';
                    return;
                }
                
                // 从变量定义中提取示例数据
                const sampleData = {};
                variableGroups.forEach(group => {
                    group.variables.forEach(variable => {
                        sampleData[variable.key] = variable.example;
                    });
                });
                
                // 为预览创建一个简化的替换函数
                let example = template;
                Object.keys(sampleData).forEach(key => {
                    const value = sampleData[key];
                    if (value !== undefined && value !== null) {
                        // 使用全局替换，确保所有实例都被替换
                        example = example.replaceAll(key, String(value));
                    }
                });
                
                // 只在自定义文件名模式下添加扩展名示例
                if (targetInputId === 'naming-pattern') {
                    // 检查最后几个字符是否已经包含扩展名，避免重复添加
                    const lastPart = example.slice(-10);
                    if (!lastPart.includes('.')) {
                        example += '.pdf';
                    }
                }

                previewExample.textContent = example;
                previewExample.title = '';
                
                // 检查文件名长度并显示警告
                const warningElement = popup.querySelector('#filename-length-warning');
                if (warningElement) {
                    const nameLength = example.length;
                    if (nameLength > 255) {
                        warningElement.style.display = 'block';
                        warningElement.style.color = '#F73116';
                        warningElement.innerHTML = '⚠️ 已超过系统文件名最大长度！ (' + nameLength + ' 字符)'
                    } else if (nameLength > 140) {
                        warningElement.style.display = 'block';
                        warningElement.style.color = '#F7A316';
                        warningElement.innerHTML = '⚠️ 文件名太长 (' + nameLength + ' 字符)，可能会导致保存失败';
                    } else if (nameLength > 80) {
                        warningElement.style.display = 'block';
                        warningElement.style.color = '#F7A316';
                        warningElement.innerHTML = '⚠️ 文件名较长 (' + nameLength + ' 字符)，建议简化模板';
                    } else if (nameLength > 50) {
                        warningElement.style.display = 'block';
                        warningElement.style.color = '#3498db';
                        warningElement.innerHTML = 'ℹ️ 文件名长度：' + nameLength + ' 字符';
                    } else {
                        warningElement.style.display = 'none';
                    }
                }
            }
        };
        
        // 初始化模板预览
        if (targetInput && templatePreview) {
            templatePreview.value = targetInput.value;
            updatePreviewExample();
        }
        
        // 监听模板输入变化
        templatePreview.addEventListener('input', updatePreviewExample);
        
        // 变量点击事件
        popup.querySelectorAll('.variable-item').forEach(item => {
            item.addEventListener('click', () => {
                const variable = item.dataset.variable;
                if (templatePreview) {
                    // 在模板预览中插入变量
                    const cursorPos = templatePreview.selectionStart || templatePreview.value.length;
                    const currentValue = templatePreview.value;
                    const newValue = currentValue.slice(0, cursorPos) + variable + currentValue.slice(cursorPos);
                    templatePreview.value = newValue;
                    
                    // 设置新的光标位置
                    setTimeout(() => {
                        templatePreview.focus();
                        templatePreview.setSelectionRange(cursorPos + variable.length, cursorPos + variable.length);
                    }, 10);
                    
                    this.showToast(`已插入: ${variable}`, 'success', 1000);
                    updatePreviewExample(); // 更新预览
                }
            });
        });
        
        // 应用模板按钮
        popup.querySelector('#apply-template').addEventListener('click', () => {
            if (targetInput && templatePreview) {
                targetInput.value = templatePreview.value;
                targetInput.focus();
                this.showToast('模板已应用', 'success', 1500);
                document.body.removeChild(overlay);
            }
        });
        
        // 让模板预览可编辑
        templatePreview.removeAttribute('readonly');

        // 关闭按钮
        popup.querySelector('#close-variable-selector').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // 清空模板按钮
        popup.querySelector('#clear-template').addEventListener('click', () => {
            if (templatePreview) {
                templatePreview.value = '';
                templatePreview.focus();
                updatePreviewExample();
                this.showToast('模板已清空', 'info', 1000);
            }
        });

        // 插入常用模式按钮
        popup.querySelector('#insert-common-pattern').addEventListener('click', () => {
            if (templatePreview) {
                templatePreview.value = '{date:YYYY-MM-DD}_{subject}_{fileName}';
                templatePreview.focus();
                updatePreviewExample();
                this.showToast('已插入常用模式', 'success', 1000);
            }
        });

        // 插入详细模式按钮
        popup.querySelector('#insert-detailed-pattern').addEventListener('click', () => {
            if (templatePreview) {
                templatePreview.value = '{date:YYYY-MM-DD}_{date:HH-mm}_{senderName}_{subject}_{fileIndex}_{fileName}';
                templatePreview.focus();
                updatePreviewExample();
                this.showToast('已插入详细模式', 'success', 1000);
            }
        });

        // 点击背景关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    saveSettings(dialog) {
        try {
            // 基础设置 - 文件命名
            const namingMode = dialog.querySelector('#naming-mode').value;
            this.downloadSettings.fileNaming.useCustomPattern = (namingMode === 'custom');
            this.downloadSettings.fileNaming.prefix = dialog.querySelector('#naming-prefix').value;
            this.downloadSettings.fileNaming.suffix = dialog.querySelector('#naming-suffix').value;
            this.downloadSettings.fileNaming.customPattern = dialog.querySelector('#naming-pattern').value;
            
            // 基础设置 - 文件夹结构
            this.downloadSettings.folderStructure = dialog.querySelector('#folder-structure').value;
            if (!this.downloadSettings.smartGrouping) this.downloadSettings.smartGrouping = {};
            this.downloadSettings.smartGrouping.enabled = dialog.querySelector('#smart-grouping').checked;
            
            // 保存自定义文件夹模板设置
            if (!this.downloadSettings.folderNaming) this.downloadSettings.folderNaming = {};
            this.downloadSettings.folderNaming.customTemplate = dialog.querySelector('#folder-custom-template').value || '{date:YYYY-MM}/{senderName}';
            
            // 文件名规范检查设置
            if (!this.downloadSettings.fileNaming.validation) this.downloadSettings.fileNaming.validation = {};
            this.downloadSettings.fileNaming.validation.enabled = dialog.querySelector('#filename-validation').value === 'enabled';
            this.downloadSettings.fileNaming.validation.pattern = dialog.querySelector('#validation-pattern').value || '\\d{6,}';
            this.downloadSettings.fileNaming.validation.fallbackPattern = dialog.querySelector('#fallback-pattern').value || 'auto';
            this.downloadSettings.fileNaming.validation.fallbackTemplate = dialog.querySelector('#fallback-template').value || '{subject}_{fileName}';
            
            // 内容替换设置
            if (!this.downloadSettings.fileNaming.validation.contentReplacement) {
                this.downloadSettings.fileNaming.validation.contentReplacement = {};
            }
            this.downloadSettings.fileNaming.validation.contentReplacement.enabled = dialog.querySelector('#enable-content-replacement').checked;
            this.downloadSettings.fileNaming.validation.contentReplacement.mode = dialog.querySelector('#replacement-mode').value || 'string';
            this.downloadSettings.fileNaming.validation.contentReplacement.search = dialog.querySelector('#replacement-search').value || '';
            this.downloadSettings.fileNaming.validation.contentReplacement.replace = dialog.querySelector('#replacement-replace').value || '';
            this.downloadSettings.fileNaming.validation.contentReplacement.global = dialog.querySelector('#replacement-global').checked;
            this.downloadSettings.fileNaming.validation.contentReplacement.caseSensitive = dialog.querySelector('#replacement-case-sensitive').checked;
            // 文件名字符处理设置
            const charHandling = dialog.querySelector('#invalid-char-handling').value;
            const replacementChar = dialog.querySelector('#invalid-char-replacement').value || '_';
            
            switch (charHandling) {
                case 'replace':
                    this.downloadSettings.fileNaming.validation.removeInvalidChars = true;
                    this.downloadSettings.fileNaming.validation.replacementChar = replacementChar;
                    break;
                case 'remove':
                    this.downloadSettings.fileNaming.validation.removeInvalidChars = true;
                    this.downloadSettings.fileNaming.validation.replacementChar = '';
                    break;
                case 'keep':
                default:
                    this.downloadSettings.fileNaming.validation.removeInvalidChars = false;
                    this.downloadSettings.fileNaming.validation.replacementChar = '';
                    break;
            }
            

            
            // 下载行为设置
            if (!this.downloadSettings.downloadBehavior) this.downloadSettings.downloadBehavior = {};
            const concurrentValue = dialog.querySelector('#concurrent-downloads').value;
            this.downloadSettings.downloadBehavior.concurrentDownloads = concurrentValue === 'auto' ? 'auto' : parseInt(concurrentValue);
            this.downloadSettings.conflictResolution = dialog.querySelector('#conflict-resolution').value;
            this.downloadSettings.downloadBehavior.showProgress = dialog.querySelector('#show-progress').checked;
            this.downloadSettings.downloadBehavior.retryOnFail = dialog.querySelector('#retry-on-fail').checked;
            this.downloadSettings.downloadBehavior.verifyDownloads = dialog.querySelector('#verify-downloads').checked;
            this.downloadSettings.downloadBehavior.notifyOnComplete = dialog.querySelector('#notify-complete').checked;
        this.downloadSettings.downloadBehavior.autoCompareAfterDownload = dialog.querySelector('#auto-compare').checked;
            
            // 过滤设置
            const minSize = parseInt(dialog.querySelector('#min-file-size').value) || 0;
            const maxSize = parseInt(dialog.querySelector('#max-file-size').value) || 0;
            const allowedTypes = dialog.querySelector('#allowed-types').value.split(',').map(t => t.trim()).filter(t => t);
            const excludedTypes = dialog.querySelector('#excluded-types').value.split(',').map(t => t.trim()).filter(t => t);
            
            this.filters.minSize = minSize * 1024; // 转换为字节
            this.filters.maxSize = maxSize > 0 ? maxSize * 1024 * 1024 : 0; // 转换为字节
            this.filters.allowedTypes = allowedTypes;
            this.filters.excludedTypes = excludedTypes;
            
            // 保存到本地存储
            localStorage.setItem('qqmail-downloader-settings', JSON.stringify({
                downloadSettings: this.downloadSettings,
                filters: this.filters
            }));
            
            this.showToast('设置已保存', 'success');
            
            // 更新文件夹结构预览（如果当前有附件数据）
            if (this.attachments && this.attachments.length > 0) {
                this.updateFolderStructurePreview(this.attachments);
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showToast('保存设置失败', 'error');
        }
    }

    resetSettings(dialog) {
        // 重置为默认设置
        this.downloadSettings = {
            fileNaming: {
                prefix: '',
                suffix: '',
                includeMailId: false,
                includeAttachmentId: false,
                includeMailSubject: false,
                includeFileType: false,
                separator: '_',
                useCustomPattern: false,
                customPattern: '{date}_{subject}_{fileName}',
                validation: {
                    enabled: true,
                    pattern: '\\d{6,}',
                    fallbackPattern: 'auto',
                    fallbackTemplate: '{subject}_{fileName}',
                    replacementChar: '_',
                    removeInvalidChars: true,
                    contentReplacement: {
                        enabled: false,
                        mode: 'string',
                        search: '',
                        replace: '',
                        global: true,
                        caseSensitive: false
                    }
                }
            },
            folderStructure: 'flat',
            folderNaming: {
                mailTemplate: '{subject}',
                dateTemplate: '{date:YYYY-MM-DD}',
                senderTemplate: '{senderName}',
                customTemplate: '{date:YYYY-MM}/{senderName}'
            },
            conflictResolution: 'rename',
            downloadBehavior: {
                showProgress: true,
                retryOnFail: true,
                verifyDownloads: true,
                notifyOnComplete: true,
                concurrentDownloads: 'auto',
                autoCompareAfterDownload: true
            },
            smartGrouping: {
                enabled: false
            }
        };
        
        this.filters = {
            date: 'all',
            dateRange: {
                start: null,
                end: null
            },
            minSize: 0,
            maxSize: 0,
            allowedTypes: [],
            excludedTypes: []
        };
        
        // 重新加载设置到界面
        this.loadSettings(dialog);
        
        // 自动保存重置后的设置
        this.saveSettings(dialog);
        
        this.showToast('设置已重置为默认值', 'info');
    }

    // 判断是否应该使用自定义命名
    shouldUseCustomNaming() {
        return this.downloadSettings.fileNaming.useCustomPattern || false;
    }

    // 在初始化时加载保存的设置
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('qqmail-downloader-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.downloadSettings) {
                    this.downloadSettings = { ...this.downloadSettings, ...settings.downloadSettings };
                }
                if (settings.filters) {
                    this.filters = { ...this.filters, ...settings.filters };
                }
            }
        } catch (error) {
            console.warn('加载保存的设置失败:', error);
        }
    }

    async showCompareDialog() {

        try {
            // 检查邮件附件数据
            const emailAttachments = this.attachments;
            if (emailAttachments.length === 0) {
                this.showToast('当前文件夹没有邮件附件数据，请确保已打开附件管理器并加载了邮件数据', 'warning');
                return;
            }

            // 直接弹出文件夹选择器
            const dirHandle = await window.showDirectoryPicker();

            
            // 创建比对结果对话框
            await this.showComparisonResults(dirHandle);
            
        } catch (error) {
            if (error.name !== 'AbortError') {

                this.showToast('比对功能执行失败: ' + error.message, 'error');
            }
        }
    }

    // 显示比对结果对话框
    async showComparisonResults(dirHandle) {
        // 创建比对结果对话框
        const dialog = this.createUI('div', {
            className: 'compare-results-dialog',
            styles: {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: '100000'
            }
        });

        const dialogContent = this.createUI('div', {
            styles: {
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '900px',
                width: '95%',
                maxHeight: '85vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
            }
        });

        dialogContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px; color: #13181D;">文件完整性比对结果</h3>
                <button class="close-dialog-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div id="compare-results" style="display: none;">
                <div id="compare-summary" style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
                    <div style="text-align: center; padding: 20px;">正在比对文件...</div>
                </div>
                <div id="missing-files" style="margin-bottom: 16px;"></div>
                <div id="duplicate-files" style="margin-bottom: 16px;"></div>
                <div id="matched-files" style="margin-bottom: 16px;"></div>
            </div>
        `;

        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);

        const closeDialog = () => document.body.removeChild(dialog);
        
        // 添加事件监听器
        dialogContent.querySelector('.close-dialog-btn').addEventListener('click', closeDialog);
        dialog.addEventListener('click', (e) => e.target === dialog && closeDialog());

        // 添加下载按钮事件监听器
        dialog.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-single-btn')) {
                const fileid = e.target.dataset.fileid;
                if (fileid) {
                    this.downloadSingleAttachment(fileid);
                }
            }
        });

        // 执行比对
        await this.performComparison(dirHandle, dialogContent);
    }

    // 执行比对
    async performComparison(dirHandle, dialogContent) {
        const resultsDiv = dialogContent.querySelector('#compare-results');
        const summaryDiv = dialogContent.querySelector('#compare-summary');
        const missingDiv = dialogContent.querySelector('#missing-files');
        const duplicateDiv = dialogContent.querySelector('#duplicate-files');
        const matchedDiv = dialogContent.querySelector('#matched-files');

        // 创建进度显示界面
        const createProgressUI = () => {
            return `
                <div style="text-align: center; padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <div id="progress-title" style="font-size: 16px; font-weight: 500; color: #13181D; margin-bottom: 8px;">正在比对文件...</div>
                        <div id="progress-subtitle" style="font-size: 14px; color: #666; margin-bottom: 12px;">准备中...</div>
                    </div>
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 4px; margin-bottom: 12px;">
                        <div id="progress-bar" style="height: 8px; background: linear-gradient(90deg, #0F7AF5, #40a9ff); border-radius: 4px; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <div id="progress-details" style="font-size: 12px; color: #999; display: flex; justify-content: space-between;">
                        <span id="progress-current">0</span>
                        <span id="progress-total">0</span>
                    </div>
                </div>
            `;
        };

        // 更新进度显示
        const updateProgress = (title, subtitle, current, total) => {
            const progressTitle = summaryDiv.querySelector('#progress-title');
            const progressSubtitle = summaryDiv.querySelector('#progress-subtitle');
            const progressBar = summaryDiv.querySelector('#progress-bar');
            const progressCurrent = summaryDiv.querySelector('#progress-current');
            const progressTotal = summaryDiv.querySelector('#progress-total');

            if (progressTitle) progressTitle.textContent = title;
            if (progressSubtitle) progressSubtitle.textContent = subtitle;
            if (progressBar) progressBar.style.width = total > 0 ? `${(current / total) * 100}%` : '0%';
            if (progressCurrent) progressCurrent.textContent = current;
            if (progressTotal) progressTotal.textContent = total;
        };

        // 显示初始进度界面
        summaryDiv.innerHTML = createProgressUI();
        resultsDiv.style.display = 'block';

        try {
            // 步骤1: 获取本地文件信息
            updateProgress('正在扫描本地文件', '读取文件夹结构...', 0, 4);
            await new Promise(resolve => setTimeout(resolve, 100)); // 让UI更新

            console.log('开始扫描本地文件...');
            const localFiles = await this.getLocalFilesWithProgress(dirHandle, updateProgress);
            console.log(`扫描完成，找到 ${localFiles.length} 个本地文件`);

            // 步骤2: 获取邮件附件信息
            const emailAttachments = this.attachments;
            console.log(`获取邮件附件信息，共 ${emailAttachments.length} 个附件`);
            updateProgress('准备比对数据', `本地文件: ${localFiles.length} 个，邮件附件: ${emailAttachments.length} 个`, 2, 4);
            await new Promise(resolve => setTimeout(resolve, 200));

            if (emailAttachments.length === 0) {
                throw new Error('当前邮件文件夹中没有附件数据，请确保已打开附件管理器并加载了邮件数据');
            }

            // 步骤3: 执行比对分析
            console.log('开始执行比对分析...');
            const comparisonResult = await this.compareFilesWithProgress(localFiles, emailAttachments, updateProgress);
            console.log('比对分析完成:', comparisonResult.summary);

            // 步骤4: 显示比对结果
            updateProgress('生成比对报告', '正在整理结果...', 4, 4);
            await new Promise(resolve => setTimeout(resolve, 100));

            this.displayComparisonResults(comparisonResult, summaryDiv, missingDiv, duplicateDiv, matchedDiv);
        
        // 添加事件监听器
        this.setupComparisonDialogEvents(dialogContent);

        } catch (error) {
            console.error('比对过程中出错:', error);
            summaryDiv.innerHTML = `<div style="color: #e74c3c; text-align: center; padding: 20px;">
                <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">比对失败</div>
                <div style="font-size: 14px; margin-bottom: 12px;">${error.message}</div>
                <div style="font-size: 12px; color: #999;">
                    请检查：<br>
                    1. 是否已选择正确的文件夹<br>
                    2. 文件夹是否有访问权限<br>
                    3. 浏览器控制台是否有错误信息
                </div>
            </div>`;
        }
    }

    // 获取本地文件信息
    async getLocalFiles(dirHandle, path = '') {
        const files = [];

        for await (const [name, handle] of dirHandle.entries()) {
            const fullPath = path ? `${path}/${name}` : name;

            if (handle.kind === 'file') {
                try {
                    const file = await handle.getFile();
                    files.push({
                        name: name,
                        path: fullPath,
                        size: file.size,
                        type: this.processFileName(name, 'getExtension')?.toLowerCase() || '',
                        lastModified: file.lastModified,
                        handle: handle
                    });
                } catch (error) {
                    // 静默忽略文件读取错误
                }
            } else if (handle.kind === 'directory') {
                // 递归读取子文件夹
                const subFiles = await this.getLocalFiles(handle, fullPath);
                files.push(...subFiles);
            }
        }

        return files;
    }

    // 带进度显示的获取本地文件信息
    async getLocalFilesWithProgress(dirHandle, updateProgress, path = '') {
        const files = [];
        let processedCount = 0;
        let totalCount = 0;
        const visitedPaths = new Set(); // 防止循环引用
        const maxDepth = 10; // 最大递归深度
        const maxFiles = 10000; // 最大文件数限制
        const startTime = Date.now();
        const maxTime = 30000; // 30秒超时

        try {
            // 首先统计总文件数（带限制）
            const countFiles = async (handle, currentPath = '', depth = 0) => {
                // 检查超时
                if (Date.now() - startTime > maxTime) {
                    throw new Error('文件扫描超时，请选择文件数量较少的文件夹');
                }

                // 检查深度限制
                if (depth > maxDepth) {
                    console.warn(`文件夹层级过深，跳过: ${currentPath}`);
                    return 0;
                }

                // 检查路径循环
                const normalizedPath = currentPath.toLowerCase();
                if (visitedPaths.has(normalizedPath)) {
                    console.warn(`检测到循环引用，跳过: ${currentPath}`);
                    return 0;
                }
                visitedPaths.add(normalizedPath);

                let count = 0;
                try {
                    const entries = [];
                    for await (const [name, subHandle] of handle.entries()) {
                        entries.push([name, subHandle]);
                        // 限制单个文件夹的条目数
                        if (entries.length > 1000) {
                            console.warn(`文件夹条目过多，仅处理前1000个: ${currentPath}`);
                            break;
                        }
                    }

                    for (const [name, subHandle] of entries) {
                        if (count > maxFiles) {
                            console.warn(`文件数量超过限制(${maxFiles})，停止扫描`);
                            break;
                        }

                        if (subHandle.kind === 'file') {
                            count++;
                        } else if (subHandle.kind === 'directory') {
                            try {
                                const subPath = currentPath ? `${currentPath}/${name}` : name;
                                count += await countFiles(subHandle, subPath, depth + 1);
                            } catch (error) {
                                console.warn(`无法访问子文件夹: ${currentPath}/${name}`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`无法读取文件夹内容: ${currentPath}`, error);
                }

                visitedPaths.delete(normalizedPath);
                return count;
            };

            updateProgress('正在扫描本地文件', '统计文件数量...', 0, 1);
            console.log('开始统计文件数量...');
            
            totalCount = await countFiles(dirHandle);
            console.log(`统计完成，发现 ${totalCount} 个文件`);
            
            if (totalCount === 0) {
                updateProgress('扫描完成', '未找到任何文件', 1, 1);
                return files;
            }

            if (totalCount > maxFiles) {
                throw new Error(`文件数量过多(${totalCount})，请选择包含文件较少的文件夹(建议少于${maxFiles}个)`);
            }

            updateProgress('正在扫描本地文件', `发现 ${totalCount} 个文件，开始处理...`, 0, totalCount);

            // 重置访问路径记录
            visitedPaths.clear();

            // 递归处理文件（带限制）
            const processFiles = async (handle, currentPath = '', depth = 0) => {
                // 检查超时
                if (Date.now() - startTime > maxTime) {
                    throw new Error('文件处理超时');
                }

                // 检查深度限制
                if (depth > maxDepth) {
                    return;
                }

                // 检查路径循环
                const normalizedPath = currentPath.toLowerCase();
                if (visitedPaths.has(normalizedPath)) {
                    return;
                }
                visitedPaths.add(normalizedPath);

                try {
                    const entries = [];
                    for await (const [name, subHandle] of handle.entries()) {
                        entries.push([name, subHandle]);
                        if (entries.length > 1000) break;
                    }

                    for (const [name, subHandle] of entries) {
                        if (files.length >= maxFiles) {
                            console.warn(`已达到文件数量限制(${maxFiles})，停止处理`);
                            break;
                        }

                        const fullPath = currentPath ? `${currentPath}/${name}` : name;

                        if (subHandle.kind === 'file') {
                            try {
                                const file = await subHandle.getFile();
                                files.push({
                                    name: name,
                                    path: fullPath,
                                    size: file.size,
                                    type: this.processFileName(name, 'getExtension')?.toLowerCase() || '',
                                    lastModified: file.lastModified,
                                    handle: subHandle
                                });
                                processedCount++;
                                
                                // 更新进度
                                if (processedCount % 50 === 0 || processedCount === totalCount) {
                                    updateProgress('正在扫描本地文件', `已处理 ${processedCount}/${totalCount} 个文件`, processedCount, totalCount);
                                    await new Promise(resolve => setTimeout(resolve, 10)); // 让UI更新
                                }
                            } catch (error) {
                                console.warn(`无法读取文件: ${fullPath}`, error);
                                processedCount++;
                            }
                        } else if (subHandle.kind === 'directory') {
                            try {
                                await processFiles(subHandle, fullPath, depth + 1);
                            } catch (error) {
                                console.warn(`无法处理子文件夹: ${fullPath}`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`处理文件夹时出错: ${currentPath}`, error);
                }

                visitedPaths.delete(normalizedPath);
            };

            await processFiles(dirHandle, path);
            updateProgress('扫描完成', `成功处理 ${files.length} 个文件`, files.length, totalCount);
            console.log(`文件扫描完成，用时: ${Date.now() - startTime}ms`);
            
        } catch (error) {
            console.error('扫描本地文件时出错:', error);
            throw new Error(`扫描本地文件失败: ${error.message}`);
        }

        return files;
    }

    // 比对文件
    // 优化的文件比对算法（减少重复计算和内存占用）
    compareFiles(localFiles, emailAttachments) {
        const result = {
            missing: [], duplicates: [], matched: [], localOnly: [],
            summary: { 
                totalEmail: emailAttachments.length, 
                totalLocal: localFiles.length, 
                missingCount: 0, 
                duplicateCount: 0, 
                matchedCount: 0,
                emailTotalSize: 0,
                localTotalSize: 0,
                matchedTotalSize: 0,
                missingTotalSize: 0
            }
        };

        // 预处理本地文件映射（合并两个映射表逻辑）
        const localFileMap = new Map();
        const usedLocalFiles = new Set();

        localFiles.forEach(file => {
            const normalizedKey = this.normalizeFileName(file.name);
            const sizeTypeKey = `${file.size}_${file.type}`;

            if (!localFileMap.has(normalizedKey)) localFileMap.set(normalizedKey, []);
            if (!localFileMap.has(sizeTypeKey)) localFileMap.set(sizeTypeKey, []);

            localFileMap.get(normalizedKey).push({ file, type: 'exact' });
            localFileMap.get(sizeTypeKey).push({ file, type: 'fuzzy' });
        });

        // 比对邮件附件（合并精确和模糊匹配逻辑）
        emailAttachments.forEach(attachment => {
            const normalizedName = this.normalizeFileName(attachment.name);
            const sizeTypeKey = `${attachment.size}_${attachment.type}`;
            let bestMatch = null;

            // 优先精确匹配
            const exactCandidates = localFileMap.get(normalizedName) ?? [];
            for (const { file } of exactCandidates.filter(c => c.type === 'exact')) {
                if (!usedLocalFiles.has(file) && file.size === attachment.size && file.type === attachment.type) {
                    bestMatch = { file, type: 'exact', similarity: 1.0 };
                    break;
                }
            }

            // 模糊匹配
            if (!bestMatch) {
                const fuzzyCandidates = localFileMap.get(sizeTypeKey) ?? [];
                let bestSimilarity = 0;

                for (const { file } of fuzzyCandidates.filter(c => c.type === 'fuzzy')) {
                    if (usedLocalFiles.has(file)) continue;

                    const similarity = this.calculateNameSimilarity(attachment.name, file.name);
                    if (similarity > 0.6 && similarity > bestSimilarity) {
                        bestMatch = { file, type: 'renamed', similarity };
                        bestSimilarity = similarity;
                    }
                }
            }

            if (bestMatch) {
                result.matched.push({ email: attachment, local: bestMatch.file, matchType: bestMatch.type, similarity: bestMatch.similarity });
                usedLocalFiles.add(bestMatch.file);
            } else {
                result.missing.push(attachment);
            }
        });

        // 检查重复和本地独有文件（合并处理逻辑）
        const localFileUsage = new Map();
        result.matched.forEach(match => {
            const key = `${match.local.path}_${match.local.size}`;
            (localFileUsage.get(key) || localFileUsage.set(key, []).get(key)).push(match);
        });

        // 批量处理重复文件和本地独有文件
        for (const matches of localFileUsage.values()) {
            if (matches.length > 1) {
                result.duplicates.push({ localFile: matches[0].local, emailAttachments: matches.map(m => m.email) });
            }
        }
        result.localOnly = localFiles.filter(file => !usedLocalFiles.has(file));

        // 计算总大小
        result.summary.emailTotalSize = emailAttachments.reduce((sum, att) => sum + att.size, 0);
        result.summary.localTotalSize = localFiles.reduce((sum, file) => sum + file.size, 0);
        result.summary.matchedTotalSize = result.matched.reduce((sum, match) => sum + match.email.size, 0);
        result.summary.missingTotalSize = result.missing.reduce((sum, att) => sum + att.size, 0);

        // 更新统计
        Object.assign(result.summary, {
            matchedCount: result.matched.length,
            missingCount: result.missing.length,
            duplicateCount: result.duplicates.length
        });

        return result;
    }

    // 带进度显示的文件比对
    async compareFilesWithProgress(localFiles, emailAttachments, updateProgress) {
        try {
            const result = {
                missing: [], duplicates: [], matched: [], localOnly: [],
                summary: { 
                    totalEmail: emailAttachments.length, 
                    totalLocal: localFiles.length, 
                    missingCount: 0, 
                    duplicateCount: 0, 
                    matchedCount: 0,
                    emailTotalSize: 0,
                    localTotalSize: 0,
                    matchedTotalSize: 0,
                    missingTotalSize: 0
                }
            };

            // 步骤1: 预处理本地文件映射
            updateProgress('分析本地文件', '建立文件索引...', 3, 4);
            await new Promise(resolve => setTimeout(resolve, 50));

            const localFileMap = new Map();
            const usedLocalFiles = new Set();

            localFiles.forEach(file => {
                const normalizedKey = this.normalizeFileName(file.name);
                const sizeTypeKey = `${file.size}_${file.type}`;

                if (!localFileMap.has(normalizedKey)) localFileMap.set(normalizedKey, []);
                if (!localFileMap.has(sizeTypeKey)) localFileMap.set(sizeTypeKey, []);

                localFileMap.get(normalizedKey).push({ file, type: 'exact' });
                localFileMap.get(sizeTypeKey).push({ file, type: 'fuzzy' });
            });

            console.log(`建立文件索引完成，本地文件映射条目: ${localFileMap.size}`);

            // 步骤2: 比对邮件附件
            updateProgress('比对文件匹配', '正在匹配邮件附件...', 3, 4);
            await new Promise(resolve => setTimeout(resolve, 50));

            for (let i = 0; i < emailAttachments.length; i++) {
                const attachment = emailAttachments[i];
                const normalizedName = this.normalizeFileName(attachment.name);
                const sizeTypeKey = `${attachment.size}_${attachment.type}`;
                let bestMatch = null;

                // 优先精确匹配
                const exactCandidates = localFileMap.get(normalizedName) ?? [];
                for (const { file } of exactCandidates.filter(c => c.type === 'exact')) {
                    if (!usedLocalFiles.has(file) && file.size === attachment.size && file.type === attachment.type) {
                        bestMatch = { file, type: 'exact', similarity: 1.0 };
                        break;
                    }
                }

                // 模糊匹配
                if (!bestMatch) {
                    const fuzzyCandidates = localFileMap.get(sizeTypeKey) ?? [];
                    let bestSimilarity = 0;

                    for (const { file } of fuzzyCandidates.filter(c => c.type === 'fuzzy')) {
                        if (usedLocalFiles.has(file)) continue;

                        const similarity = this.calculateNameSimilarity(attachment.name, file.name);
                        if (similarity > 0.6 && similarity > bestSimilarity) {
                            bestMatch = { file, type: 'renamed', similarity };
                            bestSimilarity = similarity;
                        }
                    }
                }

                if (bestMatch) {
                    result.matched.push({ email: attachment, local: bestMatch.file, matchType: bestMatch.type, similarity: bestMatch.similarity });
                    usedLocalFiles.add(bestMatch.file);
                } else {
                    result.missing.push(attachment);
                }

                // 每处理20个文件更新一次进度
                if ((i + 1) % 20 === 0 || i === emailAttachments.length - 1) {
                    updateProgress('比对文件匹配', `已处理 ${i + 1}/${emailAttachments.length} 个附件`, 3, 4);
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            console.log(`文件匹配完成，匹配: ${result.matched.length}, 缺失: ${result.missing.length}`);

            // 步骤3: 检查重复文件和本地独有文件
            updateProgress('完成分析', '检查重复文件和整理结果...', 3, 4);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 改进的重复文件检测逻辑
            result.duplicates = this.detectDuplicateFiles(result.matched, localFiles, emailAttachments);

            result.localOnly = localFiles.filter(file => !usedLocalFiles.has(file));

            // 计算总大小
                    result.summary.emailTotalSize = emailAttachments.reduce((sum, att) => sum + att.size, 0);
        result.summary.localTotalSize = localFiles.reduce((sum, file) => sum + file.size, 0);
        result.summary.matchedTotalSize = result.matched.reduce((sum, match) => sum + match.email.size, 0);
        result.summary.missingTotalSize = result.missing.reduce((sum, att) => sum + att.size, 0);

            // 更新统计
            Object.assign(result.summary, {
                matchedCount: result.matched.length,
                missingCount: result.missing.length,
                duplicateCount: result.duplicates.length,
                localOnlyCount: result.localOnly.length
            });

            console.log('比对分析完成:', result.summary);
            return result;

        } catch (error) {
            console.error('比对过程中出错:', error);
            throw new Error(`文件比对失败: ${error.message}`);
        }
    }

    // 改进的重复文件检测方法
    detectDuplicateFiles(matchedFiles, localFiles, emailAttachments) {
        const duplicates = [];
        
        // 1. 检测一个本地文件匹配多个邮件附件的情况
        const localFileToEmails = new Map();
        matchedFiles.forEach(match => {
            const localFileKey = this.generateFileKey(match.local);
            if (!localFileToEmails.has(localFileKey)) {
                localFileToEmails.set(localFileKey, []);
            }
            localFileToEmails.get(localFileKey).push(match);
        });

        // 找出一对多的匹配
        for (const [fileKey, matches] of localFileToEmails.entries()) {
            if (matches.length > 1) {
                duplicates.push({
                    type: 'oneToMany',
                    localFile: matches[0].local,
                    emailAttachments: matches.map(m => m.email),
                    reason: '一个本地文件匹配多个邮件附件',
                    severity: 'high'
                });
            }
        }

        // 2. 检测多个本地文件匹配同一个邮件附件的情况
        const emailToLocalFiles = new Map();
        matchedFiles.forEach(match => {
            const emailKey = this.generateEmailKey(match.email);
            if (!emailToLocalFiles.has(emailKey)) {
                emailToLocalFiles.set(emailKey, []);
            }
            emailToLocalFiles.get(emailKey).push(match);
        });

        // 找出多对一的匹配
        for (const [emailKey, matches] of emailToLocalFiles.entries()) {
            if (matches.length > 1) {
                duplicates.push({
                    type: 'manyToOne',
                    emailAttachment: matches[0].email,
                    localFiles: matches.map(m => m.local),
                    reason: '多个本地文件匹配同一个邮件附件',
                    severity: 'medium'
                });
            }
        }

        // 3. 检测本地文件夹中的重复文件（相同内容但不同名称）
        const localDuplicates = this.findLocalDuplicates(localFiles);
        localDuplicates.forEach(dup => {
            duplicates.push({
                type: 'localDuplicate',
                localFiles: dup.files,
                reason: dup.reason,
                severity: 'low'
            });
        });

        // 4. 检测邮件附件中的重复（相同内容但来自不同邮件）
        const emailDuplicates = this.findEmailDuplicates(emailAttachments);
        emailDuplicates.forEach(dup => {
            duplicates.push({
                type: 'emailDuplicate',
                emailAttachments: dup.files,
                reason: dup.reason,
                severity: 'info'
            });
        });

        return duplicates;
    }

    // 生成文件唯一标识键
    generateFileKey(file) {
        // 使用文件大小、修改时间和标准化文件名生成唯一键
        const normalizedName = this.normalizeFileName(file.name);
        return `${normalizedName}_${file.size}_${file.lastModified ?? 0}`;
    }

    // 生成邮件附件唯一标识键
    generateEmailKey(attachment) {
        // 使用文件大小和标准化文件名生成唯一键
        const normalizedName = this.normalizeFileName(attachment.name);
        return `${normalizedName}_${attachment.size}`;
    }

    // 查找本地文件中的重复
    findLocalDuplicates(localFiles) {
        const duplicates = [];
        const sizeGroups = new Map();

        // 按大小分组
        localFiles.forEach(file => {
            const size = file.size;
            if (!sizeGroups.has(size)) {
                sizeGroups.set(size, []);
            }
            sizeGroups.get(size).push(file);
        });

        // 检查每个大小组中的重复
        for (const [size, files] of sizeGroups.entries()) {
            if (files.length > 1) {
                // 按标准化文件名进一步分组
                const nameGroups = new Map();
                files.forEach(file => {
                    const normalizedName = this.normalizeFileName(file.name);
                    if (!nameGroups.has(normalizedName)) {
                        nameGroups.set(normalizedName, []);
                    }
                    nameGroups.get(normalizedName).push(file);
                });

                // 找出同名同大小的文件
                for (const [normalizedName, sameNameFiles] of nameGroups.entries()) {
                    if (sameNameFiles.length > 1) {
                        duplicates.push({
                            files: sameNameFiles,
                            reason: `相同大小(${this.formatData(size, 'size')})和相似文件名的文件`
                        });
                    }
                }

                // 检查不同名但相同大小的可疑重复
                const nameGroupsArray = Array.from(nameGroups.values());
                if (nameGroupsArray.length > 1 && size > 1024) { // 只检查大于1KB的文件
                    const allFiles = nameGroupsArray.flat();
                    if (allFiles.length > 1) {
                        // 检查文件名相似度
                        const similarFiles = [];
                        for (let i = 0; i < allFiles.length; i++) {
                            for (let j = i + 1; j < allFiles.length; j++) {
                                const similarity = this.calculateNameSimilarity(allFiles[i].name, allFiles[j].name);
                                if (similarity > 0.7) {
                                    if (!similarFiles.includes(allFiles[i])) similarFiles.push(allFiles[i]);
                                    if (!similarFiles.includes(allFiles[j])) similarFiles.push(allFiles[j]);
                                }
                            }
                        }
                        
                        if (similarFiles.length > 1) {
                            duplicates.push({
                                files: similarFiles,
                                reason: `相同大小(${this.formatData(size, 'size')})和相似文件名的可疑重复文件`
                            });
                        }
                    }
                }
            }
        }

        return duplicates;
    }

    // 查找邮件附件中的重复
    findEmailDuplicates(emailAttachments) {
        const duplicates = [];
        const sizeNameGroups = new Map();

        // 按大小和标准化文件名分组
        emailAttachments.forEach(attachment => {
            const normalizedName = this.normalizeFileName(attachment.name);
            const key = `${normalizedName}_${attachment.size}`;
            
            if (!sizeNameGroups.has(key)) {
                sizeNameGroups.set(key, []);
            }
            sizeNameGroups.get(key).push(attachment);
        });

        // 找出重复的邮件附件
        for (const [key, attachments] of sizeNameGroups.entries()) {
            if (attachments.length > 1) {
                // 检查是否来自不同邮件
                const uniqueEmails = new Set(attachments.map(att => att.mailSubject || att.mailId));
                if (uniqueEmails.size > 1) {
                    duplicates.push({
                        files: attachments,
                        reason: `相同文件在${uniqueEmails.size}封不同邮件中出现`
                    });
                }
            }
        }

        return duplicates;
    }

    // 标准化文件名（移除常见的重命名后缀）
    normalizeFileName(fileName) {
        // 移除扩展名
        const nameWithoutExt = this.processFileName(fileName, 'removeExtension');

        // 移除常见的重命名后缀，如 (1), (2), _1, _2 等
        const normalized = nameWithoutExt
            .replace(/\s*\(\d+\)$/, '')  // 移除 (1), (2) 等
            .replace(/\s*_\d+$/, '')     // 移除 _1, _2 等
            .replace(/\s*-\d+$/, '')     // 移除 -1, -2 等
            .replace(/\s*副本$/, '')      // 移除"副本"
            .replace(/\s*copy$/, '')      // 移除"copy"
            .replace(/\s*Copy$/, '')      // 移除"Copy"
            .replace(/\s*复制$/, '')      // 移除"复制"
            .trim();

        return normalized.toLowerCase();
    }

    // 计算文件名相似度
    calculateNameSimilarity(name1, name2) {
        const norm1 = this.normalizeFileName(name1);
        const norm2 = this.normalizeFileName(name2);

        // 如果标准化后完全相同，返回高相似度
        if (norm1 === norm2) {
            return 0.95;
        }

        // 使用编辑距离计算相似度
        const distance = this.levenshteinDistance(norm1, norm2);
        const maxLength = Math.max(norm1.length, norm2.length);

        if (maxLength === 0) return 1;

        return 1 - (distance / maxLength);
    }

    // 优化的编辑距离算法（使用滚动数组减少内存占用）
    levenshteinDistance(str1, str2) {
        if (str1 === str2) return 0;
        if (!str1.length) return str2.length;
        if (!str2.length) return str1.length;

        // 使用两个数组而不是二维矩阵，节省内存
        let prev = Array(str2.length + 1).fill(0).map((_, i) => i);
        let curr = Array(str2.length + 1);

        for (let i = 1; i <= str1.length; i++) {
            curr[0] = i;
            for (let j = 1; j <= str2.length; j++) {
                curr[j] = str1[i - 1] === str2[j - 1]
                    ? prev[j - 1]
                    : Math.min(prev[j - 1], prev[j], curr[j - 1]) + 1;
            }
            [prev, curr] = [curr, prev];
        }

        return prev[str2.length];
    }

    // 显示比对结果
    displayComparisonResults(result, summaryDiv, missingDiv, duplicateDiv, matchedDiv) {
        // 保存当前比对结果，供"保留最新"功能使用
        this.currentComparisonResult = result;
        
        // 为显示区域添加数据属性，便于后续更新
        summaryDiv.setAttribute('data-comparison-summary', '');
        missingDiv.setAttribute('data-comparison-missing', '');
        duplicateDiv.setAttribute('data-comparison-duplicates', '');
        matchedDiv.setAttribute('data-comparison-matched', '');

        // 计算统计数据
        const emailSize = result.summary.emailTotalSize;
        const localSize = result.summary.localTotalSize;
        const matchedSize = result.summary.matchedTotalSize;
        const missingSize = result.summary.missingTotalSize;
        const sizeMatchPercentage = emailSize > 0 ? Math.round((matchedSize / emailSize) * 100) : 100;
        const sizeDifference = localSize - emailSize;
        const sizeDifferenceAbs = Math.abs(sizeDifference);
        
        // 判断大小匹配状态
        const getSizeMatchStatus = () => {
            if (sizeDifferenceAbs === 0) {
                return { 
                    color: 'linear-gradient(135deg, #d4edda, #f8f9fa)', 
                    borderColor: '#c3e6cb', 
                    textColor: '#155724', 
                    icon: '✓', 
                    text: '文件夹大小完全匹配' 
                };
            }
            if (sizeDifferenceAbs < emailSize * 0.01) {
                return { 
                    color: 'linear-gradient(135deg, #e2f3ff, #f8f9fa)', 
                    borderColor: '#b3d9ff', 
                    textColor: '#0d47a1', 
                    icon: '≈', 
                    text: '文件夹大小基本匹配（差异小于1%）' 
                };
            }
            if (sizeDifferenceAbs < emailSize * 0.05) {
                return { 
                    color: 'linear-gradient(135deg, #fff3cd, #f8f9fa)', 
                    borderColor: '#ffeaa7', 
                    textColor: '#856404', 
                    icon: '⚠', 
                    text: '文件夹大小存在轻微差异（小于5%）' 
                };
            }
            return { 
                color: 'linear-gradient(135deg, #f8d7da, #f8f9fa)', 
                borderColor: '#f5c6cb', 
                textColor: '#721c24', 
                icon: '✗', 
                text: '文件夹大小存在明显差异' 
            };
        };
        
        const sizeStatus = getSizeMatchStatus();

        // 优化摘要区域 - 增加色彩层次和视觉引导
        summaryDiv.innerHTML = `
            <div style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                    <div style="width: 4px; height: 24px; background: linear-gradient(135deg, #007bff, #0056b3); border-radius: 2px;"></div>
                    <h4 style="margin: 0; font-size: 20px; font-weight: 700; color: #13181D;">比对摘要</h4>
                </div>
                
                <!-- 核心统计卡片 - 增加色彩层次 -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                        <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px; color: #495057;">${result.summary.totalEmail}</div>
                        <div style="font-size: 13px; color: #6c757d; font-weight: 600;">邮件附件总数</div>
                        <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">${this.formatData(emailSize, 'size')}</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #e8f5e8, #ffffff); border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                        <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px; color: #155724;">${result.summary.matchedCount}</div>
                        <div style="font-size: 13px; color: #155724; font-weight: 600;">匹配文件</div>
                        <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">${sizeMatchPercentage}% 大小匹配</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #fff3cd, #ffffff); border: 2px solid #ffeaa7; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 2px 6px rgba(255,193,7,0.15);">
                        <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px; color: #856404;">${result.summary.missingCount}</div>
                        <div style="font-size: 13px; color: #856404; font-weight: 600;">缺失文件</div>
                        <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">${this.formatData(missingSize, 'size')}</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #e3f2fd, #ffffff); border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                        <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px; color: #0d47a1;">${result.summary.totalLocal}</div>
                        <div style="font-size: 13px; color: #0d47a1; font-weight: 600;">本地文件总数</div>
                        <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">${this.formatData(localSize, 'size')}</div>
                    </div>
                </div>

                <!-- 大小比对状态卡片 - 增加状态色彩 -->
                <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="width: 40px; height: 40px; background: ${sizeStatus.color}; border: 1px solid ${sizeStatus.borderColor}; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: ${sizeStatus.textColor}; font-size: 16px; font-weight: bold;">${sizeStatus.icon}</div>
                        <div>
                            <h5 style="margin: 0; font-size: 18px; font-weight: 700; color: #13181D;">文件夹大小比对</h5>
                            <div style="font-size: 14px; color: #6c757d; margin-top: 2px;">${sizeStatus.text}</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 16px;">
                            <div style="font-size: 12px; color: #6c757d; margin-bottom: 6px;">已匹配文件大小</div>
                            <div style="font-size: 18px; font-weight: 700; color: #13181D;">${this.formatData(matchedSize, 'size')}</div>
                            <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">${sizeMatchPercentage}% 匹配率</div>
                        </div>
                        
                        ${sizeDifference !== 0 ? `
                            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 16px;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 6px;">大小差异</div>
                                <div style="font-size: 18px; font-weight: 700; color: #13181D;">
                                    ${sizeDifference > 0 ? '+' : ''}${this.formatData(sizeDifferenceAbs, 'size')}
                                </div>
                                <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">
                                    ${sizeDifference > 0 ? '本地文件更多' : '本地文件更少'}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // 重新设计缺失文件区域 - 增加完整信息展示
        if (result.missing.length > 0) {
            // 统计文件类型分布
            const typeStats = {};
            let totalSize = 0;
            result.missing.forEach(attachment => {
                const type = attachment.type || '未知';
                typeStats[type] = (typeStats[type] || 0) + 1;
                totalSize += attachment.size || 0;
            });
            
            missingDiv.innerHTML = `
                <div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 6px; margin-bottom: 20px;">
                    <!-- 头部概览 -->
                    <div style="padding: 16px 20px; border-bottom: 1px solid #e9ecef;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div>
                                <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #13181D;">缺失文件</h4>
                                <div style="font-size: 13px; color: #6c757d;">需要下载 ${result.missing.length} 个文件，总大小 ${this.formatData(totalSize, 'size')}</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="batch-download-missing-btn" 
                                        style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
                                        onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                                    批量下载
                                </button>
                            </div>
                        </div>
                        
                        <!-- 文件类型统计 -->
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            ${Object.entries(typeStats).map(([type, count]) => `
                                <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 4px 8px; font-size: 11px;">
                                    <span style="color: #6c757d;">${type}:</span>
                                    <span style="color: #13181D; font-weight: 600; margin-left: 4px;">${count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- 缺失文件列表 -->
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${result.missing.map((attachment, index) => `
                            <div style="border-bottom: ${index === result.missing.length - 1 ? 'none' : '1px solid #f8f9fa'}; padding: 16px 20px; transition: background 0.2s;" 
                                 onmouseover="this.style.background='#f8f9fa'" 
                                 onmouseout="this.style.background='transparent'">
                                
                                <!-- 文件信息 -->
                                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
                                    <div style="width: 4px; height: 16px; background: #ffc107; border-radius: 2px; flex-shrink: 0; margin-top: 2px;"></div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 600; color: #13181D; margin-bottom: 4px; word-break: break-all; font-size: 14px;">
                                            ${this.processData(attachment.name, 'escapeHtml')}
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 16px; font-size: 12px; color: #6c757d; margin-bottom: 6px;">
                                            <span>${this.formatData(attachment.size, 'size')}</span>
                                            <span>${attachment.type || '未知类型'}</span>
                                            ${attachment.fileid ? `<span>ID: ${attachment.fileid}</span>` : ''}
                                        </div>
                                        
                                        <!-- 来源邮件信息 -->
                                        ${attachment.mailSubject || attachment.mailSender || attachment.mailDate ? `
                                            <div style="background: #f8f9fa; border-radius: 4px; padding: 6px 10px; margin-top: 6px;">
                                                <div style="font-size: 11px; color: #6c757d; margin-bottom: 2px;">来源邮件:</div>
                                                <div style="font-size: 12px; color: #13181D;">
                                                    ${attachment.mailSubject ? `
                                                        <div style="font-weight: 500; margin-bottom: 2px; word-break: break-all;">
                                                            ${this.processData(attachment.mailSubject, 'escapeHtml')}
                                                        </div>
                                                    ` : ''}
                                                    <div style="display: flex; gap: 12px; font-size: 11px; color: #6c757d;">
                                                        ${attachment.mailSender ? `<span>发件人: ${this.processData(attachment.mailSender, 'escapeHtml')}</span>` : ''}
                                                        ${attachment.mailDate ? `<span>日期: ${this.formatDate(attachment.mailDate, 'YYYY-MM-DD HH:mm')}</span>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <!-- 操作按钮 -->
                                    <div style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                                        <button data-fileid="${attachment.fileid}" class="download-single-btn" 
                                                style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: background 0.2s; white-space: nowrap;"
                                                onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                                            下载
                                        </button>
                                        ${attachment.mailId ? `
                                            <button onclick="window.attachmentManager.openMail('${attachment.mailId}')" 
                                                    style="padding: 4px 8px; background: transparent; color: #6c757d; border: 1px solid #dee2e6; border-radius: 4px; font-size: 10px; cursor: pointer; transition: all 0.2s;"
                                                    onmouseover="this.style.background='#f8f9fa'; this.style.color='#13181D'" onmouseout="this.style.background='transparent'; this.style.color='#6c757d'">
                                                查看邮件
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            missingDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #f0fff4, #ffffff); border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(40,167,69,0.1);">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #c3e6cb, #d4edda); border: 1px solid #28a745; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #155724; font-size: 20px;">✓</div>
                    <h4 style="margin: 0 0 8px 0; color: #155724; font-size: 18px; font-weight: 700;">文件完整</h4>
                    <div style="color: #155724; font-size: 14px;">所有邮件附件都已存在于本地文件夹中</div>
                </div>
            `;
        }

        // 重新设计重复文件检测面板 - 简洁清晰的信息架构
        if (result.duplicates.length > 0) {
            const duplicatesByType = this.groupDuplicatesByType(result.duplicates);
            const canKeepLatestCount = result.duplicates.filter(dup => this.canKeepLatestFile(dup)).length;
            
            // 统计各类型数量
            const typeStats = Object.entries(duplicatesByType).map(([type, duplicates]) => ({
                type,
                count: duplicates.length,
                title: this.getDuplicateTypeTitle(type).replace(/[⚠️🔄📁📧❓]\s*/, '') // 移除表情符号
            }));
            
            duplicateDiv.innerHTML = `
                <div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 6px; margin-bottom: 20px;">
                    <!-- 头部概览 -->
                    <div style="padding: 16px 20px; border-bottom: 1px solid #e9ecef;">
                        <div style="display: flex; align-items: center; justify-content: between; gap: 16px;">
                            <div>
                                <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #13181D;">重复文件检测</h4>
                                <div style="font-size: 13px; color: #6c757d;">发现 ${result.duplicates.length} 个重复项，需要处理</div>
                            </div>
                            ${canKeepLatestCount > 0 ? `
                                <button class="batch-keep-latest-btn" data-count="${canKeepLatestCount}"
                                        style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.2s; white-space: nowrap;"
                                        onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                                    批量保留最新 (${canKeepLatestCount})
                                </button>
                            ` : ''}
                        </div>
                        
                        <!-- 类型统计 -->
                        <div style="display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap;">
                            ${typeStats.map(stat => `
                                <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 6px 10px; font-size: 12px;">
                                    <span style="color: #6c757d;">${stat.title}:</span>
                                    <span style="color: #13181D; font-weight: 600; margin-left: 4px;">${stat.count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- 重复项列表 -->
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${Object.entries(duplicatesByType).map(([type, duplicates], typeIndex) => `
                            ${duplicates.map((dup, dupIndex) => this.renderDuplicateItem(dup, this.getDuplicateGlobalIndex(result.duplicates, dup))).join('')}
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            duplicateDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #f0fff4, #ffffff); border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(40,167,69,0.1);">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #c3e6cb, #d4edda); border: 1px solid #28a745; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #155724; font-size: 20px;">✓</div>
                    <h4 style="margin: 0 0 8px 0; color: #155724; font-size: 18px; font-weight: 700;">无重复文件</h4>
                    <div style="color: #155724; font-size: 14px;">未检测到重复或相似的文件</div>
                </div>
            `;
        }

        // 优化匹配文件区域 - 增加成功色彩提示
        if (result.matched.length > 0) {
            const exactMatches = result.matched.filter(match => match.type === 'exact');
            const renamedMatches = result.matched.filter(match => match.type === 'renamed');
            
            matchedDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #f0fff4, #ffffff); border: 1px solid #c3e6cb; border-radius: 8px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(40,167,69,0.1);">
                    <div style="background: linear-gradient(135deg, #d4edda, #ffffff); border-bottom: 1px solid #c3e6cb; padding: 16px 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #c3e6cb, #d4edda); border: 1px solid #28a745; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #155724;">✓</div>
                                <div>
                                    <h4 style="margin: 0; font-size: 18px; font-weight: 700; color: #155724;">匹配文件</h4>
                                    <div style="font-size: 13px; color: #155724; margin-top: 2px;">已成功匹配的文件</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 24px; font-weight: 700; color: #155724;">${result.matched.length}</div>
                                <div style="font-size: 11px; color: #155724;">个文件</div>
                            </div>
                        </div>
                    </div>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${exactMatches.length > 0 ? `
                            <div style="padding: 12px 20px; background: #f8f9fa; color: #13181D; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e9ecef;">
                                精确匹配 (${exactMatches.length})
                            </div>
                            ${exactMatches.map((match, index) => `
                                <div style="padding: 16px 20px; border-bottom: ${index === exactMatches.length - 1 && renamedMatches.length === 0 ? 'none' : '1px solid #f8f9fa'}; display: flex; align-items: center; gap: 16px; transition: background 0.2s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
                                    <div style="width: 6px; height: 6px; background: #13181D; border-radius: 50%; flex-shrink: 0;"></div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 600; color: #13181D; margin-bottom: 4px; word-break: break-all;">${this.processData(match.email.name, 'escapeHtml')}</div>
                                        <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6c757d;">
                                            <span>${this.formatData(match.email.size, 'size')}</span>
                                            <span>•</span>
                                            <span>${match.email.type}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        ` : ''}
                        
                        ${renamedMatches.length > 0 ? `
                            <div style="padding: 12px 20px; background: #f8f9fa; color: #13181D; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e9ecef;">
                                重命名匹配 (${renamedMatches.length})
                            </div>
                            ${renamedMatches.map((match, index) => `
                                <div style="padding: 16px 20px; border-bottom: ${index === renamedMatches.length - 1 ? 'none' : '1px solid #f8f9fa'}; display: flex; align-items: center; gap: 16px; transition: background 0.2s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
                                    <div style="width: 6px; height: 6px; background: #6c757d; border-radius: 50%; flex-shrink: 0;"></div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 600; color: #13181D; margin-bottom: 4px; word-break: break-all;">${this.processData(match.email.name, 'escapeHtml')}</div>
                                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">→ ${this.processData(match.local.name, 'escapeHtml')}</div>
                                        <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6c757d;">
                                            <span>${this.formatData(match.email.size, 'size')}</span>
                                            <span>•</span>
                                            <span>${match.email.type}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            matchedDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #dee2e6, #f8f9fa); border: 1px solid #adb5bd; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #6c757d; font-size: 20px;">○</div>
                    <h4 style="margin: 0 0 8px 0; color: #495057; font-size: 18px; font-weight: 700;">无匹配文件</h4>
                    <div style="color: #6c757d; font-size: 14px;">未找到匹配的文件</div>
                </div>
            `;
        }

        // 设置事件监听器
        this.setupComparisonDialogEvents(summaryDiv.parentNode);
    }

    // 按类型分组重复文件
    groupDuplicatesByType(duplicates) {
        const grouped = {};
        duplicates.forEach(dup => {
            if (!grouped[dup.type]) {
                grouped[dup.type] = [];
            }
            grouped[dup.type].push(dup);
        });
        return grouped;
    }

    // 获取重复文件类型的颜色配置
    getDuplicateTypeColor(type) {
        const colors = {
            'oneToMany': { bg: '#fff3cd', text: '#856404' },
            'manyToOne': { bg: '#f8d7da', text: '#721c24' },
            'localDuplicate': { bg: '#d1ecf1', text: '#0c5460' },
            'emailDuplicate': { bg: '#e2e3e5', text: '#383d41' }
        };
        return colors[type] || { bg: '#f8f9fa', text: '#495057' };
    }

    // 获取重复文件类型的标题
    getDuplicateTypeTitle(type) {
        const titles = {
            'oneToMany': '⚠️ 一对多匹配',
            'manyToOne': '🔄 多对一匹配',
            'localDuplicate': '📁 本地重复文件',
            'emailDuplicate': '📧 邮件重复附件'
        };
        return titles[type] || '❓ 未知类型';
    }

    // 渲染重复文件项 - 重新设计为简洁统一的格式
    renderDuplicateItem(dup, index) {
        const canKeepLatest = this.canKeepLatestFile(dup);
        const typeInfo = this.getDuplicateTypeInfo(dup.type);
        
        return `
            <div style="border-bottom: 1px solid #f8f9fa; padding: 16px 20px; transition: background 0.2s;" 
                 data-dup-index="${index}" 
                 onmouseover="this.style.background='#f8f9fa'" 
                 onmouseout="this.style.background='transparent'">
                
                <!-- 重复类型标识 -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <div style="width: 4px; height: 16px; background: ${typeInfo.color}; border-radius: 2px;"></div>
                    <div style="font-weight: 600; color: #13181D; font-size: 14px;">${typeInfo.title}</div>
                    <div style="font-size: 12px; color: #6c757d; background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">
                        ${dup.reason}
                    </div>
                </div>
                
                <!-- 重复文件详情 -->
                ${this.renderDuplicateDetails(dup)}
                
                <!-- 操作按钮 -->
                ${canKeepLatest ? `
                    <div style="margin-top: 12px; text-align: right;">
                        <button class="keep-latest-btn" data-index="${index}"
                                style="background: #28a745; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
                                onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                            保留最新
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 获取重复类型信息
    getDuplicateTypeInfo(type) {
        const typeMap = {
            'oneToMany': { title: '一对多匹配', color: '#ffc107' },
            'manyToOne': { title: '多对一匹配', color: '#dc3545' },
            'localDuplicate': { title: '本地重复文件', color: '#17a2b8' },
            'emailDuplicate': { title: '邮件重复附件', color: '#6c757d' }
        };
        return typeMap[type] || { title: '未知类型', color: '#6c757d' };
    }
    
    // 渲染重复文件详情
    renderDuplicateDetails(dup) {
        switch (dup.type) {
            case 'oneToMany':
                return `
                    <!-- 本地文件 -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">本地文件:</div>
                        <div style="background: #f8f9fa; border-radius: 4px; padding: 8px 12px;">
                            <div style="font-weight: 600; color: #13181D; margin-bottom: 2px; word-break: break-all;">
                                ${this.processData(dup.localFile.name, 'escapeHtml')}
                            </div>
                            <div style="font-size: 12px; color: #6c757d;">
                                ${this.formatData(dup.localFile.size, 'size')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 匹配的邮件附件 -->
                    <div>
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">匹配的邮件附件 (${dup.emailAttachments.length}):</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${dup.emailAttachments.map(att => `
                                <div style="background: #f8f9fa; border-radius: 4px; padding: 6px 10px; font-size: 12px;">
                                    <div style="color: #13181D; font-weight: 500; margin-bottom: 2px; word-break: break-all;">
                                        ${this.processData(att.name, 'escapeHtml')}
                                    </div>
                                    <div style="color: #6c757d; display: flex; gap: 12px;">
                                        <span>${this.formatData(att.size, 'size')}</span>
                                        ${att.date ? `<span>${this.formatDate(att.date, 'MM-DD HH:mm')}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
            case 'manyToOne':
                return `
                    <!-- 邮件附件 -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">邮件附件:</div>
                        <div style="background: #f8f9fa; border-radius: 4px; padding: 8px 12px;">
                            <div style="font-weight: 600; color: #13181D; margin-bottom: 2px; word-break: break-all;">
                                ${this.processData(dup.emailAttachment.name, 'escapeHtml')}
                            </div>
                            <div style="font-size: 12px; color: #6c757d;">
                                ${this.formatData(dup.emailAttachment.size, 'size')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 匹配的本地文件 -->
                    <div>
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">匹配的本地文件 (${dup.localFiles.length}):</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${dup.localFiles.map(file => `
                                <div style="background: #f8f9fa; border-radius: 4px; padding: 6px 10px; font-size: 12px;">
                                    <div style="color: #13181D; font-weight: 500; margin-bottom: 2px; word-break: break-all;">
                                        ${this.processData(file.name, 'escapeHtml')}
                                    </div>
                                    <div style="color: #6c757d; display: flex; gap: 12px; flex-wrap: wrap;">
                                        <span>${this.formatData(file.size, 'size')}</span>
                                        ${file.path ? `<span>路径: ${file.path}</span>` : ''}
                                        ${file.lastModified ? `<span>修改: ${this.formatDate(file.lastModified, 'MM-DD HH:mm')}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
            case 'localDuplicate':
                return `
                    <div>
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">重复的本地文件 (${dup.localFiles.length}):</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${dup.localFiles.map(file => `
                                <div style="background: #f8f9fa; border-radius: 4px; padding: 6px 10px; font-size: 12px;">
                                    <div style="color: #13181D; font-weight: 500; margin-bottom: 2px; word-break: break-all;">
                                        ${this.processData(file.name, 'escapeHtml')}
                                    </div>
                                    <div style="color: #6c757d; display: flex; gap: 12px; flex-wrap: wrap;">
                                        <span>${this.formatData(file.size, 'size')}</span>
                                        ${file.path ? `<span>路径: ${file.path}</span>` : ''}
                                        ${file.lastModified ? `<span>修改: ${this.formatDate(file.lastModified, 'MM-DD HH:mm')}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
            case 'emailDuplicate':
                return `
                    <div>
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">重复的邮件附件 (${dup.emailAttachments.length}):</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${dup.emailAttachments.map(att => `
                                <div style="background: #f8f9fa; border-radius: 4px; padding: 6px 10px; font-size: 12px;">
                                    <div style="color: #13181D; font-weight: 500; margin-bottom: 2px; word-break: break-all;">
                                        ${this.processData(att.name, 'escapeHtml')}
                                    </div>
                                    <div style="color: #6c757d; display: flex; gap: 12px; flex-wrap: wrap;">
                                        <span>${this.formatData(att.size, 'size')}</span>
                                        <span>来自: ${att.mailSubject || '未知邮件'}</span>
                                        ${att.date ? `<span>${this.formatDate(att.date, 'MM-DD HH:mm')}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
            default:
                return `<div style="font-size: 12px; color: #6c757d;">未知重复类型</div>`;
        }
    }

    // 获取重复项在全局数组中的索引
    getDuplicateGlobalIndex(allDuplicates, targetDup) {
        return allDuplicates.findIndex(dup => dup === targetDup);
    }

    // 判断是否可以执行"保留最新"操作
    canKeepLatestFile(dup) {
        switch (dup.type) {
            case 'localDuplicate':
                return dup.localFiles && dup.localFiles.length > 1 && 
                       dup.localFiles.some(file => file.lastModified);
            case 'emailDuplicate':
                return dup.emailAttachments && dup.emailAttachments.length > 1 && 
                       dup.emailAttachments.some(att => att.date);
            case 'manyToOne':
                return dup.localFiles && dup.localFiles.length > 1 && 
                       dup.localFiles.some(file => file.lastModified);
            default:
                return false;
        }
    }

    // 保留最新文件，删除旧文件
    async keepLatestFile(duplicateIndex) {
        if (!this.currentComparisonResult || !this.currentComparisonResult.duplicates) {
            this.showToast('比对结果不存在', 'error');
            return;
        }

        const dup = this.currentComparisonResult.duplicates[duplicateIndex];
        if (!dup) {
            this.showToast('重复文件项不存在', 'error');
            return;
        }

        try {
            let result;
            switch (dup.type) {
                case 'localDuplicate':
                    result = await this.keepLatestLocalFiles(dup);
                    break;
                case 'emailDuplicate':
                    result = await this.keepLatestEmailAttachments(dup);
                    break;
                case 'manyToOne':
                    result = await this.keepLatestInManyToOne(dup);
                    break;
                default:
                    this.showToast('此类型不支持保留最新操作', 'warning');
                    return;
            }

            if (result.success) {
                this.showToast(`已保留最新文件，删除了 ${result.deletedCount} 个旧文件`, 'success');
                // 从重复列表中移除已处理的项
                this.currentComparisonResult.duplicates.splice(duplicateIndex, 1);
                // 重新渲染比对结果
                this.refreshComparisonDisplay();
            } else {
                this.showToast(`操作失败: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('保留最新文件时出错:', error);
            this.showToast(`操作失败: ${error.message}`, 'error');
        }
    }

    // 保留最新的本地文件
    async keepLatestLocalFiles(dup, silent = false) {
        const files = dup.localFiles;
        if (!files || files.length <= 1) {
            return { success: false, error: '文件数量不足' };
        }

        // 按修改时间排序，最新的在前
        const sortedFiles = files.sort((a, b) => {
                    const timeA = a.lastModified ?? 0;
        const timeB = b.lastModified ?? 0;
            return timeB - timeA;
        });

        const latestFile = sortedFiles[0];
        const filesToDelete = sortedFiles.slice(1);

        // 确认操作（非静默模式）
        if (!silent) {
            const confirmMessage = `确定要保留最新文件并删除 ${filesToDelete.length} 个旧文件吗？\n\n保留: ${latestFile.name}\n删除: ${filesToDelete.map(f => f.name).join(', ')}`;
            if (!confirm(confirmMessage)) {
                return { success: false, error: '用户取消操作' };
            }
        }

        let deletedCount = 0;
        const errors = [];

        // 删除旧文件
        for (const file of filesToDelete) {
            try {
                if (file.handle) {
                    await file.handle.remove();
                    deletedCount++;
                } else {
                    errors.push(`无法删除 ${file.name}: 文件句柄不存在`);
                }
            } catch (error) {
                errors.push(`删除 ${file.name} 失败: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('删除文件时出现部分错误:', errors);
        }

        return { 
            success: deletedCount > 0, 
            deletedCount, 
            error: errors.length > 0 ? errors.join('; ') : null 
        };
    }

    // 保留最新的邮件附件（标记为下载，其他忽略）
    async keepLatestEmailAttachments(dup, silent = false) {
        const attachments = dup.emailAttachments;
        if (!attachments || attachments.length <= 1) {
            return { success: false, error: '附件数量不足' };
        }

        // 按邮件日期排序，最新的在前
        const sortedAttachments = attachments.sort((a, b) => {
                    const timeA = new Date(a.date ?? 0).getTime();
        const timeB = new Date(b.date ?? 0).getTime();
            return timeB - timeA;
        });

        const latestAttachment = sortedAttachments[0];
        const oldAttachments = sortedAttachments.slice(1);

        // 确认操作（非静默模式）
        if (!silent) {
            const confirmMessage = `确定要标记最新附件为下载，忽略 ${oldAttachments.length} 个旧附件吗？\n\n下载: ${latestAttachment.name} (${this.formatDate(latestAttachment.date, 'YYYY-MM-DD')})\n忽略: ${oldAttachments.map(att => `${att.name} (${this.formatDate(att.date, 'YYYY-MM-DD')})`).join(', ')}`;
            if (!confirm(confirmMessage)) {
                return { success: false, error: '用户取消操作' };
            }
        }

        // 这里可以实现将旧附件从下载列表中移除的逻辑
        // 或者添加到忽略列表中
        return { 
            success: true, 
            deletedCount: oldAttachments.length,
            message: `已标记保留最新附件: ${latestAttachment.name}` 
        };
    }

    // 在多对一匹配中保留最新的本地文件
    async keepLatestInManyToOne(dup, silent = false) {
        return await this.keepLatestLocalFiles(dup, silent);
    }

    // 批量保留最新文件
    async batchKeepLatest() {
        if (!this.currentComparisonResult || !this.currentComparisonResult.duplicates) {
            this.showToast('比对结果不存在', 'error');
            return;
        }

        const duplicates = this.currentComparisonResult.duplicates;
        const processableDuplicates = duplicates
            .map((dup, index) => ({ dup, index }))
            .filter(({ dup }) => this.canKeepLatestFile(dup));

        if (processableDuplicates.length === 0) {
            this.showToast('没有可以批量处理的重复文件', 'warning');
            return;
        }

        // 确认操作
        const confirmMessage = `确定要批量处理 ${processableDuplicates.length} 个重复文件组吗？\n\n此操作将：\n- 保留每组中最新的文件\n- 删除其他旧版本文件\n\n此操作不可撤销！`;
        if (!confirm(confirmMessage)) {
            return;
        }

        this.showProgress('正在批量处理重复文件...');
        
        let processedCount = 0;
        let totalDeleted = 0;
        const errors = [];

        // 按索引降序处理，避免索引变化问题
        const sortedDuplicates = processableDuplicates.sort((a, b) => b.index - a.index);

        for (const { dup, index } of sortedDuplicates) {
            try {
                let result;
                switch (dup.type) {
                    case 'localDuplicate':
                        result = await this.keepLatestLocalFiles(dup, true); // 静默模式
                        break;
                    case 'emailDuplicate':
                        result = await this.keepLatestEmailAttachments(dup, true); // 静默模式
                        break;
                    case 'manyToOne':
                        result = await this.keepLatestInManyToOne(dup, true); // 静默模式
                        break;
                    default:
                        continue;
                }

                if (result.success) {
                    totalDeleted += result.deletedCount;
                    // 从重复列表中移除已处理的项
                    this.currentComparisonResult.duplicates.splice(index, 1);
                    processedCount++;
                } else {
                    errors.push(`处理失败: ${result.error}`);
                }
            } catch (error) {
                errors.push(`处理重复文件时出错: ${error.message}`);
            }
        }

        this.hideProgress();

        // 显示结果
        if (processedCount > 0) {
            this.showToast(`批量处理完成！处理了 ${processedCount} 个重复文件组，删除了 ${totalDeleted} 个旧文件`, 'success');
            // 重新渲染比对结果
            this.refreshComparisonDisplay();
        } else {
            this.showToast('批量处理失败', 'error');
        }

        if (errors.length > 0) {
            console.warn('批量处理过程中的错误:', errors);
            this.showToast(`处理过程中出现 ${errors.length} 个错误，请查看控制台`, 'warning');
        }
    }

    // 设置比较对话框事件监听器
    setupComparisonDialogEvents(dialogContent) {
        // 批量保留最新按钮
        const batchKeepLatestBtns = dialogContent.querySelectorAll('.batch-keep-latest-btn');
        batchKeepLatestBtns.forEach(btn => {
            btn.addEventListener('click', () => this.batchKeepLatest());
            btn.addEventListener('mouseenter', (e) => e.target.style.background = '#138496');
            btn.addEventListener('mouseleave', (e) => e.target.style.background = '#17a2b8');
        });

        // 单个保留最新按钮
        const keepLatestBtns = dialogContent.querySelectorAll('.keep-latest-btn');
        keepLatestBtns.forEach(btn => {
            const index = parseInt(btn.dataset.index);
            btn.addEventListener('click', () => this.keepLatestFile(index));
            btn.addEventListener('mouseenter', (e) => e.target.style.background = '#218838');
            btn.addEventListener('mouseleave', (e) => e.target.style.background = '#28a745');
        });

        // 验证设置按钮
        const validationSettingsBtns = dialogContent.querySelectorAll('.validation-settings-btn');
        validationSettingsBtns.forEach(btn => {
            btn.addEventListener('click', () => this.openValidationSettings());
            btn.addEventListener('mouseenter', (e) => e.target.style.background = 'var(--theme_primary_hover, #0056b3)');
            btn.addEventListener('mouseleave', (e) => e.target.style.background = 'var(--theme_primary, #007bff)');
        });
    }

    // 刷新比对结果显示
    refreshComparisonDisplay() {
        if (!this.currentComparisonResult) return;

        const summaryDiv = document.querySelector('[data-comparison-summary]');
        const missingDiv = document.querySelector('[data-comparison-missing]');
        const duplicateDiv = document.querySelector('[data-comparison-duplicates]');
        const matchedDiv = document.querySelector('[data-comparison-matched]');

        if (summaryDiv && missingDiv && duplicateDiv && matchedDiv) {
            this.displayComparisonResults(
                this.currentComparisonResult, 
                summaryDiv, 
                missingDiv, 
                duplicateDiv, 
                matchedDiv
            );
            // 重新设置事件监听器
            this.setupComparisonDialogEvents(summaryDiv.closest('.comparison-dialog'));
        }
    }

    // 下载单个附件
    async downloadSingleAttachment(fileid) {
        const attachment = this.attachments.find(att => att.fileid === fileid);
        if (!attachment) {
            this.showToast('附件不存在', 'error');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker();
            await this.downloadAttachment(attachment, dirHandle);
            this.showToast('下载完成', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showToast('下载失败: ' + error.message, 'error');
            }
        }
    }




    // 优化的过滤器应用（减少重复过滤操作）
    applyFilters() {
        const { fileTypes, timeRange, searchKeyword } = this.filters;

        // 预定义文件类型映射
        const fileTypeMap = {
            '文档': new Set(['doc', 'docx', 'pdf', 'txt', 'rtf']),
            '图片': new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']),
            '压缩包': new Set(['zip', 'rar', '7z', 'tar', 'gz']),
            '其他': new Set(['doc', 'docx', 'pdf', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'zip', 'rar', '7z', 'tar', 'gz'])
        };

        // 预计算时间范围
        const timeFilter = timeRange !== '全部' ? (() => {
            const now = new Date();
            const ranges = {
                '今天': new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                '本周': new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()),
                '本月': new Date(now.getFullYear(), now.getMonth(), 1),
                '今年': new Date(now.getFullYear(), 0, 1)
            };
            const threshold = ranges[timeRange];
            return threshold ? (att => new Date(att.date) >= threshold) : null;
        })() : null;

        // 预处理搜索关键词
        const keyword = searchKeyword?.toLowerCase();

        // 单次遍历应用所有过滤器
        const filteredAttachments = this.attachments.filter(attachment => {
            // 文件类型过滤
            if (fileTypes.length > 0 && !fileTypes.includes('全部')) {
                const ext = this.processFileName(attachment.name, 'getExtension')?.toLowerCase();
                const matchesType = fileTypes.some(type => {
                    const typeSet = fileTypeMap[type];
                    return type === '其他' ? !typeSet.has(ext) : typeSet?.has(ext);
                });
                if (!matchesType) return false;
            }

            // 时间过滤
            if (timeFilter && !timeFilter(attachment)) return false;

            // 关键词过滤
            if (keyword && !attachment.name.toLowerCase().includes(keyword) &&
                !attachment.mailSubject?.toLowerCase().includes(keyword)) return false;

            return true;
        });

        this.updateAttachmentList(filteredAttachments);
    }

    // 文件类型常量
    static FILE_TYPES = {
        '图片': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
        '文档': ['doc', 'docx', 'pdf', 'txt', 'rtf', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'],
        '压缩包': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
        '视频': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'],
        '音频': ['mp3', 'wav', 'flac', 'aac', 'ogg']
    };

    getFileType(filename) {
        const ext = filename?.split('.').pop()?.toLowerCase() || '';
        for (const [type, extensions] of Object.entries(AttachmentManager.FILE_TYPES)) {
            if (extensions.includes(ext)) return type;
        }
        return '其他';
    }

    // Toast图标常量
    static TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    // 选择器常量
    static SELECTORS = {
        CONTENT_AREA: '#attachment-content-area',
        OVERLAY_PANEL: '#attachment-manager-overlay',
        MANAGER_PANEL: '.attachment-manager-panel',
        OVERLAY_CONTENT: '.attachment-overlay-content',
        OVERLAY_TOOLBAR: '.attachment-overlay-toolbar',
        DOWNLOADER_BTN: '#attachment-downloader-btn',
        DATA_ATTR: '[data-attachment-manager]',
        CUSTOM_STYLES: 'style[data-attachment-manager]'
    };



    async processMailsInBatches(mails, folderId) {
        const batchSize = 5;
        const totalBatches = Math.ceil(mails.length / batchSize);
        let mailIndex = 1;
        
        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize;
            const batch = mails.slice(start, start + batchSize);
            
            for (const mail of batch) {
                if (mail?.normal_attach?.length > 0) {
                    const mailAttachments = this.processMailAttachments(mail);
                    // 为每个邮件的附件设置mailIndex和attachIndex
                    mailAttachments.forEach((attachment, attachIndex) => {
                        attachment.mailIndex = mailIndex;
                        attachment.attachIndex = attachIndex + 1;
                    });
                    this.attachments.push(...mailAttachments);
                    mailIndex++;
                }
            }
            
            // 每处理5封邮件让出主线程
            if (i < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            // 更新进度（减少频率）
            if (i % 2 === 0 || i === totalBatches - 1) {
                const progress = Math.round(((i + 1) / totalBatches) * 100);
                this.updateStatus(`正在处理邮件... ${progress}%`);
            }
        }
        
        // 处理完所有附件后，为每个附件设置fileIndex
        this.attachments.forEach((attachment, index) => {
            attachment.fileIndex = index + 1;
        });
    }

    processMailAttachments(mail) {
        const sid = this.downloader.sid;
        const mailData = {
            mailId: mail.emailid,
            mailSubject: mail.subject,
            totime: mail.totime,
            sender: mail.senders?.item?.[0]?.email,
            senderName: mail.senders?.item?.[0]?.nick,
            date: mail.totime
        };

        return mail.normal_attach
            .filter(attach => attach?.name && attach?.download_url)
            .map(attach => {
                const dotIndex = attach.name.lastIndexOf('.');
                const nameWithoutExt = dotIndex > 0 ? attach.name.substring(0, dotIndex) : attach.name;
                const ext = dotIndex > 0 ? attach.name.substring(dotIndex + 1) : '';

                let downloadUrl = attach.download_url;
                if (!downloadUrl.startsWith('http')) {
                    downloadUrl = MAIL_CONSTANTS.BASE_URL + downloadUrl;
                }
                if (!downloadUrl.includes('sid=')) {
                    downloadUrl += `${downloadUrl.includes('?') ? '&' : '?'}sid=${sid}`;
                }

                return {
                    ...attach,
                    ...mailData,
                    nameWithoutExt,
                    ext,
                    type: ext?.toLowerCase() || '', // 添加type字段，与本地文件保持一致
                    download_url: downloadUrl
                };
            });
    }

    // 字符串和数据处理工具方法
    // 统一数据处理工具
    processData(data, operation) {
        switch (operation) {
            case 'escapeHtml':
                const div = document.createElement('div');
                div.textContent = data;
                return div.innerHTML;
            case 'createSafeDate':
                if (!data) return null;
                let date;
                if (typeof data === 'string') {
                    date = new Date(data);
                } else if (typeof data === 'number') {
                    date = new Date(data < 10000000000 ? data * 1000 : data);
                } else {
                    date = new Date(data);
                }
                return isNaN(date.getTime()) ? null : date;
            default:
                return data;
        }
    }

    // 统一UI工厂
    createUI(type, config = {}) {
        const { className, styles, content, events, children, attributes, id } = config;
        let element;

        switch (type) {
            case 'button':
                element = document.createElement('button');
                if (content) element.innerHTML = content;
                break;
            case 'div':
                element = document.createElement('div');
                if (content) element.innerHTML = content;
                break;
            case 'span':
                element = document.createElement('span');
                if (content) element.textContent = content;
                break;
            case 'dialog':
                element = document.createElement('div');
                StyleManager.applyStyle(element, 'dialogs', 'compareDialog');
                break;
            case 'menu':
                element = document.createElement('div');
                StyleManager.applyStyle(element, 'menus', 'dropdown');
                break;
            case 'menuItem':
                element = document.createElement('div');
                StyleManager.applyStyle(element, 'menus', 'item');
                if (content) element.textContent = content;
                break;
            case 'card':
                element = document.createElement('div');
                StyleManager.applyStyle(element, 'cards', 'attachment');
                break;
            case 'toolbar':
                element = document.createElement('div');
                StyleManager.applyStyle(element, 'toolbars', 'overlay');
                break;
            default:
                element = document.createElement(type);
        }

        if (id) element.id = id;
        if (className) element.className = className;
        if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        if (styles) {
            if (typeof styles === 'string') {
                // 如果styles是字符串，直接设置cssText
                element.style.cssText = styles;
            } else if (typeof styles === 'object' && styles !== null) {
                // 如果styles是对象，逐个设置属性
                Object.entries(styles).forEach(([key, value]) => {
                    // 过滤掉数字索引和无效的CSS属性名
                    if (typeof key === 'string' &&
                        !key.match(/^\d+$/) &&
                        (typeof value === 'string' || typeof value === 'number')) {
                        try {
                            element.style[key] = value;
                        } catch (error) {
                            // 静默忽略CSS属性设置错误
                        }
                    }
                });
            }
        }
        if (events) {
            Object.entries(events).forEach(([event, handler]) => {
                if (event === 'hover') {
                    element.onmouseover = handler.enter;
                    element.onmouseout = handler.leave;
                } else {
                    element.addEventListener(event, handler);
                }
            });
        }
        if (children) {
            children.forEach(child => element.appendChild(child));
        }

        return element;
    }

    // DOM操作工具
    domHelper(operation, ...args) {
        switch (operation) {
            case 'query': return document.querySelector(args[0]);
            case 'queryAll': return document.querySelectorAll(args[0]);
            case 'remove':
                const elements = typeof args[0] === 'string' ? document.querySelectorAll(args[0]) : [args[0]];
                elements.forEach(el => el?.remove());
                break;
            default: return null;
        }
    }





    getFileIcon(filename) {
        const ext = filename?.split('.').pop()?.toLowerCase() || '';
        const icons = {
            // 图片
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️',
            // 文档
            'doc': '📄', 'docx': '📄', 'pdf': '📄', 'txt': '📄', 'rtf': '📄',
            // 表格
            'xls': '📊', 'xlsx': '📊', 'csv': '📊',
            // 演示文稿
            'ppt': '📑', 'pptx': '📑',
            // 压缩包
            'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️', 'tar': '🗜️', 'gz': '🗜️',
            // 其他
            'default': '📎'
        };
        return icons[ext] || icons.default;
    }

    // 获取文件缩略图URL
    getThumbnailUrl(attachment) {
        if (!attachment || !attachment.name || !attachment.fileid || !attachment.mailId) {
            return null;
        }

        const ext = attachment.name.split('.').pop()?.toLowerCase() || '';
        const supportedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const supportedDocTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
        
        // 只为支持预览的文件类型生成缩略图URL
        if (!supportedImageTypes.includes(ext) && !supportedDocTypes.includes(ext)) {
            return null;
        }

        // 获取当前的sid
        const sid = this.downloader?.getSid?.() || '';
        if (!sid) {
            return null;
        }

        // 构建缩略图URL，参考您提供的格式
        const thumbnailUrl = `https://wx.mail.qq.com/attach/thumbnail?mailid=${attachment.mailId}&fileid=${attachment.fileid}&name=${encodeURIComponent(attachment.name)}&sid=${sid}`;
        
        return thumbnailUrl;
    }

    // 判断文件是否支持缩略图预览
    supportsThumbnail(filename) {
        const ext = filename?.split('.').pop()?.toLowerCase() || '';
        const supportedTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
        return supportedTypes.includes(ext);
    }

    getFilteredAttachments() {
        if (!Array.isArray(this.attachments)) {
            return [];
        }

        let filtered = this.attachments.filter(attachment => {
            if (!attachment) {
                return false;
            }

            // 新的文件类型筛选
            if (this.currentFilter !== 'all') {
                const fileType = this.getFileType(attachment.name);
                switch (this.currentFilter) {
                    case 'images':
                        if (fileType !== '图片') return false;
                        break;
                    case 'documents':
                        if (fileType !== '文档') return false;
                        break;
                    case 'archives':
                        if (fileType !== '压缩包') return false;
                        break;
                    case 'others':
                        if (['图片', '文档', '压缩包', '视频', '音频'].includes(fileType)) return false;
                        break;
                }
            }

            // 原有的日期筛选
            if (this.filters.date !== 'all') {
                const date = this.processData(attachment.date || attachment.totime, 'createSafeDate');
                if (!date) return false; // 如果日期无效，过滤掉

                const now = new Date();
                switch (this.filters.date) {
                    case 'today':
                        if (date.toDateString() !== now.toDateString()) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                        if (date < weekAgo) return false;
                        break;
                    case 'month':
                        if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
                        break;
                    case 'custom':
                        if (this.filters.dateRange.start && date < this.filters.dateRange.start) return false;
                        if (this.filters.dateRange.end && date > this.filters.dateRange.end) return false;
                        break;
                }
            }

            // 文件大小过滤（使用设置中的配置）
            const fileSize = attachment.size;
            if (this.filters.minSize > 0 && fileSize < this.filters.minSize) return false;
            if (this.filters.maxSize > 0 && fileSize > this.filters.maxSize) return false;

            // 文件类型过滤（使用设置中的配置）
                    const fileName = attachment.name;
            const fileExt = fileName?.split('.').pop()?.toLowerCase() || '';

            // 允许的文件类型
            if (this.filters.allowedTypes && this.filters.allowedTypes.length > 0) {
                if (!this.filters.allowedTypes.includes(fileExt)) return false;
            }

            // 排除的文件类型
            if (this.filters.excludedTypes && this.filters.excludedTypes.length > 0) {
                if (this.filters.excludedTypes.includes(fileExt)) return false;
            }

            return true;
        });

        // 应用排序
        return this.getSortedAttachments(filtered);
    }

    getSortedAttachments(attachments) {
        return attachments.sort((a, b) => {
            let comparison = 0;
            switch (this.currentSort) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'date':
                    const dateA = a.date || a.totime;
                    const dateB = b.date || b.totime;
                    comparison = dateA && dateB ? dateA - dateB : 0;
                    break;
                case 'type':
                    const typeA = this.getFileType(a.name);
                    const typeB = this.getFileType(b.name);
                    comparison = typeA.localeCompare(typeB);
                    break;
                default:
                    // 默认按日期降序
                    const defaultDateA = a.date || a.totime;
                    const defaultDateB = b.date || b.totime;
                    comparison = defaultDateB - defaultDateA;
                    break;
            }
            // 默认降序排列，除非是名称排序
            return this.currentSort === 'name' ? comparison : -comparison;
        });
    }

    showSortMenu(button) {
        const rect = button.getBoundingClientRect();
        const menu = this.createUI('menu', {
            styles: {
                top: (rect.bottom + 4) + 'px',
                left: rect.left + 'px'
            }
        });

        const sortOptions = [
            { value: 'date', label: '按日期' },
            { value: 'size', label: '按大小' },
            { value: 'name', label: '按名称' }
        ];

        sortOptions.forEach(option => {
            const item = this.createUI('menuItem', { content: option.label });

            if (this.filters.sortBy === option.value) {
                item.style.background = 'var(--base_gray_005, rgba(20, 46, 77, 0.05))';
                const orderIcon = this.createUI('span', {
                    content: this.filters.sortOrder === 'asc' ? '↑' : '↓'
                });
                item.appendChild(orderIcon);
            }

            item.addEventListener('click', () => {
                if (this.filters.sortBy === option.value) {
                    this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.filters.sortBy = option.value;
                    this.filters.sortOrder = 'desc';
                }
                this.applyFilters();
                menu.remove();
            });

            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== button) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }



    applySearch(keyword) {
        if (!keyword) {
            this.displayAttachments(this.attachments);
            return;
        }

        keyword = keyword.toLowerCase();
        const filteredAttachments = this.attachments.filter(attachment =>
            attachment.name.toLowerCase().includes(keyword) ||
            (attachment.mailSubject && attachment.mailSubject.toLowerCase().includes(keyword)) ||
            (attachment.senderName && attachment.senderName.toLowerCase().includes(keyword))
        );
        this.displayAttachments(filteredAttachments);
    }

    // 统一选择管理
    manageSelection(action = 'toggle') {
        const checkboxes = this.domHelper('queryAll', `${AttachmentManager.SELECTORS.CONTENT_AREA} input[type="checkbox"]`);
        const allSelected = this.selectedAttachments.size === checkboxes.length;

        switch (action) {
            case 'toggle':
                if (allSelected) {
                    this.selectedAttachments.clear();
                    checkboxes.forEach(cb => cb.checked = false);
                } else {
                    checkboxes.forEach(cb => {
                        cb.checked = true;
                        this.selectedAttachments.add(cb.dataset.attachmentId);
                    });
                }
                break;
            case 'clear':
                this.selectedAttachments.clear();
                checkboxes.forEach(cb => cb.checked = false);
                break;
            case 'selectAll':
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    this.selectedAttachments.add(cb.dataset.attachmentId);
                });
                break;
        }
        this.updateSmartDownloadButton();
    }

    // 创建标准按钮
    createButton(type, config = {}) {
        const { text, onClick, className = '', styles = {} } = config;
        const buttonStyles = {
            primary: {
                padding: '0 24px', height: '32px', background: '#0F7AF5', color: '#fff',
                border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px 0 rgba(15,122,245,0.08)'
            },
            secondary: {
                padding: '0 24px', height: '32px', background: '#fff', color: '#0F7AF5',
                border: '1.5px solid #0F7AF5', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s'
            },
            outline: {
                padding: '0 16px', height: '32px', background: '#fff', color: '#666',
                border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                cursor: 'pointer', transition: 'all 0.2s'
            }
        };

        return this.createUI('button', {
            content: text,
            className,
            styles: { ...buttonStyles[type], ...styles },
            events: {
                click: onClick,
                hover: {
                    enter: () => {
                        if (type === 'primary') {
                            event.target.style.background = '#0e66cb';
                            event.target.style.boxShadow = '0 4px 16px 0 rgba(15,122,245,0.13)';
                        } else if (type === 'outline') {
                            event.target.style.backgroundColor = '#f5f5f5';
                            event.target.style.borderColor = '#40a9ff';
                        }
                    },
                    leave: () => {
                        if (type === 'primary') {
                            event.target.style.background = '#0F7AF5';
                            event.target.style.boxShadow = '0 2px 8px 0 rgba(15,122,245,0.08)';
                        } else if (type === 'outline') {
                            event.target.style.backgroundColor = '#fff';
                            event.target.style.borderColor = '#d9d9d9';
                        }
                    }
                }
            }
        });
    }

    // 统一下载方法
    async downloadAll() {
        const filteredAttachments = this.getFilteredAttachments();
        await this.performDownload(filteredAttachments, '全部');
    }

    async downloadSelected() {
        if (this.selectedAttachments.size === 0) {
            this.showToast('请先选择要下载的附件', 'warning');
            return;
        }
        const selectedAttachments = this.attachments.filter(att => this.selectedAttachments.has(att.name_md5));
        await this.performDownload(selectedAttachments, '选中', true);
    }

    async performDownload(attachments, type, clearSelection = false) {
        if (this.downloading) {
            this.showToast('已有下载任务正在进行中', 'warning');
            return;
        }

        if (attachments.length === 0) {
            this.showToast(`当前没有可下载的${type}附件`, 'warning');
            return;
        }

        try {
            const dirHandle = await this.selectDownloadFolder();

            this.downloading = true;
            this.showToast(`准备下载${type} ${attachments.length} 个附件...`, 'info');

            this.totalTasksForProgress = attachments.length;
            this.completedTasksForProgress = 0;
            this.showProgress();
            this.updateDownloadProgress();

            const results = await this.downloadWithConcurrency(attachments, dirHandle);
            const successCount = results.filter(r => !r.error).length;
            const failCount = results.filter(r => r.error).length;

            this.showToast(
                failCount > 0
                    ? `${type}下载完成。成功: ${successCount}，失败: ${failCount}`
                    : `${type} ${successCount} 个附件下载成功完成。`,
                failCount > 0 ? 'warning' : 'success'
            );
            this.updateStatus('下载处理完毕');

            if (clearSelection) {
                this.manageSelection('clear');
            }

            // 自动启动对比功能（如果下载成功且支持文件系统API）
            if (successCount > 0 && window.showDirectoryPicker && this.downloadSettings.downloadBehavior?.autoCompareAfterDownload) {
                this.autoCompareAfterDownload(dirHandle, successCount, failCount, type);
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                this.showToast('已取消下载', 'info');
            } else {
                this.showToast(`下载过程中发生错误: ${error.message}`, 'error');
            }
        } finally {
            this.downloading = false;
            this.hideProgress();
        }
    }

    // 下载完成后自动对比
    async autoCompareAfterDownload(dirHandle, successCount, failCount, type) {
        try {
            // 延迟一点时间，确保文件系统写入完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showToast(`${type}下载完成，正在自动对比本地文件...`, 'info', 2000);
            
            // 直接使用下载时的目录句柄进行对比
            await this.showComparisonResults(dirHandle);
            
        } catch (error) {
            console.error('自动对比失败:', error);
            // 根据错误类型给出不同的提示
            if (error.name === 'NotAllowedError') {
                this.showToast('自动对比需要文件系统权限，请手动点击"对比本地"按钮', 'warning');
            } else if (error.name === 'AbortError') {
                // 用户取消了对比，不需要显示错误
                return;
            } else {
                this.showToast('自动对比失败，可手动点击"对比本地"按钮进行对比', 'warning');
            }
        }
    }

    async downloadAttachment(attachment, dirHandle, namingStrategy = null) {
        const attachmentName = attachment.name || 'unknown_attachment';

        try {
            // 获取附件内容
            const response = await this.downloader.fetchAttachment(attachment);

            // 确定目标文件夹
            const targetFolderHandle = await this.getTargetFolder(dirHandle, attachment);

            // 检查是否支持文件系统访问API
            if (window.showDirectoryPicker) {
                try {
                    const fileNamingConfig = this.downloadSettings.fileNaming;
                    const baseFileName = this.generateFileName(attachment, fileNamingConfig, this.attachments, namingStrategy);
                    const finalFileName = await this.handleFileConflict(targetFolderHandle, baseFileName);

                    const fileHandle = await targetFolderHandle.getFileHandle(finalFileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(response.response);
                    await writable.close();

                    // 验证下载完整性
                    if (this.downloadSettings.downloadBehavior.verifyDownloads) {
                        const isValid = await this.verifyDownload(fileHandle, response.response.size);
                        if (!isValid) {
                            console.warn(`文件 ${finalFileName} 下载验证失败`);
                        }
                    }

                    return true;
                } catch (error) {
                    throw error;
                }
            } else {
                try {
                    // 使用GM_download
                    const fileNamingConfig = this.downloadSettings.fileNaming;
                    const blob = response.response;
                    const url = URL.createObjectURL(blob);
                    const fileName = this.generateFileName(attachment, fileNamingConfig, this.attachments, namingStrategy);

                    await new Promise((resolve, reject) => {
                        GM_download({
                            url: url,
                            name: fileName,
                            saveAs: true,
                                onload: function () {
                                URL.revokeObjectURL(url);
                                resolve();
                            },
                                onerror: function (error) {
                                URL.revokeObjectURL(url);
                                reject(error);
                            }
                        });
                    });
                    return true;
                } catch (error) {
                    throw error;
                }
            }
        } catch (error) {
            throw error;
        }
    }

    // 验证下载完整性
    async verifyDownload(fileHandle, expectedSize) {
        try {
            const file = await fileHandle.getFile();
            const actualSize = file.size;
            return actualSize === expectedSize;
        } catch (error) {
            return false;
        }
    }

    updateDownloadProgress() {
        if (this.totalTasksForProgress === 0) {
            const progressElement = document.querySelector('#download-progress-bar');
            if (progressElement) {
                progressElement.style.width = '0%';
            }
            return;
        }

        const progress = (this.completedTasksForProgress / this.totalTasksForProgress) * 100;
        const [progressElement, statusElement] = [
            this.domHelper('query', '#download-progress-bar'),
            this.domHelper('query', '#download-status')
        ];

        if (progressElement) {
            progressElement.style.width = `${progress}%`;

            if (progress < 100) {
                progressElement.style.transition = 'width 0.3s ease-in-out';
            } else {
                progressElement.style.transition = 'none';
            }
        }

        if (statusElement) {
            // 确保统计数据有效
            const completedSize = this.downloadStats.completedSize || 0;
            const totalSize = this.downloadStats.totalSize || 0;
            const speed = this.downloadStats.speed || 0;
            
            // 计算剩余时间
            const remainingSize = Math.max(0, totalSize - completedSize);
            const remainingTime = speed > 0 ? remainingSize / speed : 0;

            // 格式化时间
            const formatTime = (seconds) => {
                if (!seconds || seconds <= 0) return '计算中...';
                if (seconds < 60) return `${Math.round(seconds)}秒`;
                if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
                return `${Math.round(seconds / 3600)}小时`;
            };

            // 更新状态文本
            statusElement.innerHTML = `
                ${Math.round(progress)}% -
                ${this.formatData(completedSize, 'size')} / ${this.formatData(totalSize, 'size')} -
                ${this.formatData(speed, 'size')}/s -
                剩余时间: ${formatTime(remainingTime)}
            `;
        }
    }

    // 统一状态管理
    updateStatus(message, showProgress = false) {
        // 更新工具栏副标题状态
        const countInfo = document.getElementById('attachment-count-info');
        if (countInfo) {
            countInfo.textContent = message;
        }

        // 更新进度条区域状态（用于下载过程）
        const status = document.getElementById('download-status');
        if (status) {
            status.textContent = message;
            status.style.opacity = '0';
            setTimeout(() => {
                status.style.transition = 'opacity 0.3s ease';
                status.style.opacity = '1';
            }, 10);
        }

        if (showProgress) this.showProgress(message);
    }

    showProgress(message = '正在下载附件...') {
        const progressArea = document.getElementById('attachment-progress-area');
        if (progressArea) {
            StyleManager.applyStyle(progressArea, 'progress', 'area');
            progressArea.innerHTML = `
                <div style="margin-bottom: 8px; font-weight: 500; color: var(--base_gray_100, #13181D);">${message}</div>
                <div style="background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 8px;">
                    <div id="download-progress-bar" style="background: var(--theme_primary, #0F7AF5); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div id="download-status" style="font-size: 12px; color: var(--base_gray_050, #888);">准备开始...</div>
            `;
        }
    }

    hideProgress() {
        const progressArea = document.getElementById('attachment-progress-area');
        if (progressArea) {
            progressArea.style.display = 'none';
            progressArea.innerHTML = '';
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const icon = AttachmentManager.TOAST_ICONS[type];

        const toast = this.createUI('div', {
            content: `${icon} ${message}`,
            styles: {
                ...StyleManager.getStyles().toasts.base,
                ...StyleManager.getStyles().toastExtensions.custom,
                borderLeft: `3px solid ${this.getToastColor(type)}`
            }
        });

        // 确保动画样式已添加
        this.ensureToastAnimations();

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    ensureToastAnimations() {
        // 检查是否已经添加了动画样式
        if (document.getElementById('toast-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn { 
                from { transform: translateX(100%); opacity: 0; } 
                to { transform: translateX(0); opacity: 1; } 
            }
            @keyframes slideOut { 
                from { transform: translateX(0); opacity: 1; } 
                to { transform: translateX(100%); opacity: 0; } 
            }
        `;
        document.head.appendChild(style);
    }

    ensureVariableSelectorStyles() {
        // 检查是否已经添加了变量选择器样式
        if (document.getElementById('variable-selector-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'variable-selector-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            .popup-header {
                flex-shrink: 0;
                padding: 24px 28px 16px 28px;
                border-bottom: 1px solid #f0f0f0;
            }
            .template-section {
                flex-shrink: 0;
                padding: 20px 28px;
                background: #fafbfc;
                border-bottom: 1px solid #e8eaed;
            }
            .variables-section {
                flex: 1;
                overflow-y: auto;
                padding: 20px 28px;
                min-height: 0;
            }
            .variables-section::-webkit-scrollbar {
                width: 6px;
            }
            .variables-section::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            .variables-section::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
            .variables-section::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
            .popup-footer {
                flex-shrink: 0;
                padding: 16px 28px 24px 28px;
                border-top: 1px solid #f0f0f0;
                background: #fafbfc;
            }
            .variable-group {
                margin-bottom: 18px;
            }
            .variable-group:last-child {
                margin-bottom: 0;
            }
            .variable-group-title {
                font-size: 14px;
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid #e0e0e0;
            }
            .variables-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 8px;
            }
            .variable-item {
                padding: 10px 12px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s ease;
                background: white;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .variable-item:hover {
                background: #f0f8ff;
                border-color: #007bff;
                box-shadow: 0 2px 4px rgba(0,123,255,0.1);
                transform: translateY(-1px);
            }
            .variable-key {
                font-weight: 600;
                color: #007bff;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 12px;
            }
            .variable-name {
                font-size: 10px;
                color: #666;
                background: #f5f5f5;
                padding: 1px 4px;
                border-radius: 2px;
                display: inline-block;
            }
            .variable-desc {
                font-size: 11px;
                color: #666;
                margin-top: 2px;
                line-height: 1.2;
            }
        `;
        document.head.appendChild(style);
    }

    getToastColor(type) {
        const colors = {
            success: 'var(--chrome_green, #16F761)',
            error: 'var(--chrome_red, #F73116)',
            warning: 'var(--chrome_orange, #F7A316)',
            info: 'var(--theme_primary, #0F7AF5)'
        };
        return colors[type] || colors.info;
    }

    // 统一格式化工具
    formatData(data, type) {
        switch (type) {
            case 'size':
                if (!data || data === 0) return '0 B';
                const units = ['B', 'KB', 'MB', 'GB'];
                let size = data;
                let unitIndex = 0;
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex++;
                }
                return `${size.toFixed(2)} ${units[unitIndex]}`;
            case 'totalSize':
                const totalSize = data.reduce((sum, att) => sum + att.size, 0);
                return this.formatData(totalSize, 'size');
            default:
                return data;
        }
    }

    groupAttachmentsByMail(attachments) {
        const groups = new Map();
        for (const attachment of attachments) {
            const key = attachment.mailId;
            if (!groups.has(key)) {
                groups.set(key, {
                    mailId: attachment.mailId,
                    subject: attachment.mailSubject,
                    date: attachment.totime,
                    sender: attachment.sender,
                    senderName: attachment.senderName,
                    attachments: []
                });
            }
            groups.get(key).attachments.push(attachment);
        }
        return Array.from(groups.values());
    }

    // 下载分组附件
    async downloadGroupAttachments(group, groupContainer) {
        if (this.downloading) {
            this.showToast('已有下载任务正在进行中', 'warning');
            return;
        }

        const checkboxes = groupContainer.querySelectorAll('input[type="checkbox"]');
        const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.attachmentId);
        const attachmentsToDownload = selectedIds.length > 0
            ? group.attachments.filter(a => selectedIds.includes(a.name_md5))
            : group.attachments;

        if (!attachmentsToDownload?.length) {
            this.showToast('此邮件组没有可下载的附件', 'info');
            return;
        }

        try {
            const dirHandle = await this.selectDownloadFolder();
            this.downloading = true;
            this.showToast(`准备并发下载邮件组中的 ${attachmentsToDownload.length} 个附件...`, 'info');
            this.totalTasksForProgress = attachmentsToDownload.length;
            this.completedTasksForProgress = 0;
            this.showProgress();
            this.updateDownloadProgress();

            const results = await this.downloadWithConcurrency(attachmentsToDownload, dirHandle);
            const successCount = results.filter(r => !r.error).length;
            const failCount = results.filter(r => r.error).length;

            this.showToast(
                failCount > 0
                    ? `邮件组下载完成。成功: ${successCount}，失败: ${failCount}`
                    : `邮件组中 ${successCount} 个附件下载成功。`,
                failCount > 0 ? 'warning' : 'success'
            );
            this.updateStatus('下载处理完毕');

            // 自动启动对比功能（如果下载成功且支持文件系统API）
            if (successCount > 0 && window.showDirectoryPicker && this.downloadSettings.downloadBehavior?.autoCompareAfterDownload) {
                this.autoCompareAfterDownload(dirHandle, successCount, failCount, '邮件组');
            }
        } catch (error) {
            this.showToast(
                error.name === 'AbortError'
                    ? '已取消选择文件夹进行分组下载'
                    : `邮件组下载过程中发生错误: ${error.message}`,
                error.name === 'AbortError' ? 'info' : 'error'
            );
        } finally {
            this.downloading = false;
            this.hideProgress();
        }
    }

    // 统一状态显示方法
    showState(type, message = '', container = null) {
        // 移除已存在的状态
        const existingState = document.getElementById('attachment-state');
        if (existingState) {
            existingState.remove();
        }

        const stateDiv = this.createUI('div', {
            styles: { id: 'attachment-state' }
        });
        stateDiv.id = 'attachment-state';

        if (type === 'loading') {
            const loadingStyles = StyleManager.getStyles().states.loading;
            stateDiv.style.cssText = loadingStyles;
            const spinner = this.createUI('div', {
                styles: StyleManager.getStyles().states.spinner
            });
            const text = this.createUI('div', {
                content: message || '正在加载附件...',
                styles: StyleManager.getStyles().progress.text
            });
            stateDiv.appendChild(spinner);
            stateDiv.appendChild(text);
            StyleManager.addSpinnerAnimation();
        } else if (type === 'error') {
            const errorStyles = {
                ...StyleManager.getStyles().toasts.base,
                ...StyleManager.getStyles().errors.centered,
                borderLeft: '3px solid var(--chrome_red, #F73116)'
            };
            Object.entries(errorStyles).forEach(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                    stateDiv.style[key] = value;
                }
            });
            const icon = this.createUI('div', {
                content: '!',
                styles: StyleManager.getStyles().texts.errorIcon
            });
            const text = this.createUI('div', {
                content: message,
                styles: StyleManager.getStyles().texts.errorText
            });
            stateDiv.appendChild(icon);
            stateDiv.appendChild(text);
            setTimeout(() => stateDiv.remove(), 5000);
        }

        if (container) {
            container.style.position = 'relative';
            container.appendChild(stateDiv);
        }
    }



    // 获取目标文件夹
    async getTargetFolder(baseDirHandle, attachment) {
        let currentDirHandle = baseDirHandle;

        switch (this.downloadSettings.folderStructure) {
            case 'subject':
                // 按主题组织
                const subjectFolderName = this.sanitizeFileName(attachment.mailSubject || attachment.subject || '未知主题', attachment);
                if (subjectFolderName) {
                    currentDirHandle = await this.getOrCreateFolder(currentDirHandle, subjectFolderName);
                }
                break;

            case 'sender':
                // 按发件人组织
                const senderFolderName = this.sanitizeFileName(attachment.senderEmail || attachment.sender || '未知发件人', attachment);
                if (senderFolderName) {
                    currentDirHandle = await this.getOrCreateFolder(currentDirHandle, senderFolderName);
                }
                break;

            case 'date':
                // 按日期组织 (MM-DD格式)
                const mailDate = attachment.date || attachment.totime ? 
                    new Date(typeof (attachment.date || attachment.totime) === 'number' && (attachment.date || attachment.totime) < 10000000000 ? 
                        (attachment.date || attachment.totime) * 1000 : (attachment.date || attachment.totime)) : new Date();
                const dateFolderName = this.formatDate(mailDate, 'MM-DD');
                if (dateFolderName) {
                    currentDirHandle = await this.getOrCreateFolder(currentDirHandle, dateFolderName);
                }
                break;

            case 'custom':
                // 自定义文件夹结构 - 使用自定义模板
                const customTemplate = this.downloadSettings.folderNaming?.customTemplate || '{date:YYYY-MM}/{senderName}';
                const folderPaths = this.generateCustomFolderPath(customTemplate, attachment);
                for (const folderPath of folderPaths) {
                    if (folderPath) {
                        currentDirHandle = await this.getOrCreateFolder(currentDirHandle, folderPath);
                    }
                }
                break;

            case 'flat':
                // 不创建子文件夹
                return currentDirHandle;
        }

        return currentDirHandle;
    }

    // 生成文件夹名称
    generateFolderName(template, attachment) {
        const variableData = this.buildVariableData(attachment);
        let folderName = this.replaceVariablesInTemplate(template, variableData);
        
        // 清理文件夹名中的无效字符
        folderName = this.sanitizeFileName(folderName, attachment);
        
        // 如果文件夹名为空或只包含无效字符，使用默认名称
        if (!folderName || folderName.trim() === '') {
            folderName = '未知文件夹';
        }
        
        return folderName;
    }

    // 生成自定义文件夹路径
    generateCustomFolderPath(template, attachment) {
        const variableData = this.buildVariableData(attachment);
        let fullPath = this.replaceVariablesInTemplate(template, variableData);
        
        // 按 / 分割路径
        const folderPaths = fullPath.split('/').map(path => {
            const cleanPath = this.sanitizeFileName(path.trim(), attachment);
            return cleanPath || '未知文件夹';
        }).filter(path => path && path !== '');
        
        return folderPaths;
    }

    // 根据总数计算补零位数（最少2位）
    calculatePaddingDigits(total) {
        return Math.max(2, total.toString().length);
    }

    // 格式化索引号，根据总数动态补零
    formatIndex(index, total) {
        const digits = this.calculatePaddingDigits(total);
        return String(index || 1).padStart(digits, '0');
    }

    // 构建变量数据
    buildVariableData(attachment) {
        const now = new Date();
        const mailDate = attachment.date || attachment.totime ? 
            new Date(typeof (attachment.date || attachment.totime) === 'number' && (attachment.date || attachment.totime) < 10000000000 ? 
                (attachment.date || attachment.totime) * 1000 : (attachment.date || attachment.totime)) : now;
        
        // 获取总邮件数和总附件数用于动态补零
        const totalMails = this.totalMailCount || (this.attachments ? new Set(this.attachments.map(att => att.mailId)).size : 1);
        const totalAttachments = this.attachments ? this.attachments.length : 1;
        
        return {
            // 邮件信息（对可能包含非法字符的字段进行预清理）
            subject: this.sanitizeFileName(attachment.mailSubject || attachment.subject || '未知主题', attachment),
            sender: this.sanitizeFileName(attachment.sender || '未知发件人', attachment),
            senderEmail: attachment.senderEmail || '',
            senderName: this.sanitizeFileName(attachment.senderName || attachment.sender || '未知发件人', attachment),
            mailIndex: this.formatIndex(attachment.mailIndex, totalMails),
            folderID: attachment.folderId || '',
            folderName: this.sanitizeFileName(this.getFolderDisplayName() || '未知文件夹', attachment),
            mailId: attachment.mailId || '',
            
            // 附件信息
            fileName: attachment.name || '未知文件',
            fileNameNoExt: this.processFileName(attachment.name || '未知文件', 'removeExtension'),
            fileType: this.processFileName(attachment.name || '', 'getExtension'),
            fileId: attachment.fileid || '',
            fileIndex: this.formatIndex(attachment.fileIndex, totalAttachments),
            attachIndex: this.formatIndex(attachment.attachIndex, totalAttachments),
            size: attachment.size || 0,
            
            // 日期时间（保留原始Date对象和格式化字符串）
            date: mailDate, // 保留原始Date对象用于自定义格式化
            time: this.formatDate(mailDate, 'HH-mm-ss'),
            datetime: this.formatDate(mailDate, 'YYYY-MM-DD_HH-mm-ss'),
            timestamp: Math.floor(mailDate.getTime() / 1000),
            year: this.formatDate(mailDate, 'YYYY'),
            month: this.formatDate(mailDate, 'MM'),
            monthName: this.formatDate(mailDate, 'MMMM'),
            day: this.formatDate(mailDate, 'DD'),
            weekday: this.formatDate(mailDate, 'dddd'),
            weekdayName: this.formatDate(mailDate, 'ddd'),
            hour: this.formatDate(mailDate, 'HH'),
            hour12: this.formatDate(mailDate, 'hh'),
            minute: this.formatDate(mailDate, 'mm'),
            second: this.formatDate(mailDate, 'ss'),
            ampm: this.formatDate(mailDate, 'A'),
            AMPM: this.formatDate(mailDate, 'A')
        };
    }

    // 处理文件冲突
    async handleFileConflict(folderHandle, fileName) {
        try {
            // 检查文件是否存在
        try {
            await folderHandle.getFileHandle(fileName);
                // 文件已存在，需要处理冲突
                const conflictResolution = this.downloadSettings.conflictResolution;
                switch (conflictResolution) {
                    case 'rename':
                        return this.generateUniqueFileName(folderHandle, fileName);
                    case 'overwrite':
                        return fileName;
                    case 'skip':
                        throw new Error(`文件 ${fileName}已存在，跳过下载`);
                    default:
                        // 默认使用重命名
                        return this.generateUniqueFileName(folderHandle, fileName);
                }
            } catch (error) {
                // 文件不存在，直接返回原文件名
                return fileName;
            }
        } catch (error) {
            throw error;
        }
    }

    async generateUniqueFileName(folderHandle, fileName) {
        const ext = fileName.split('.').pop();
        const baseName = fileName.slice(0, -(ext.length + 1));
        let counter = 1;
        let newFileName = fileName;

        while (true) {
            try {
                await folderHandle.getFileHandle(newFileName);
                // 文件存在，尝试下一个名称
                newFileName = `${baseName}_${counter}.${ext}`;
                counter++;
        } catch (error) {
                // 文件不存在，可以使用这个名称
                return newFileName;
            }
        }
    }

    // 并发下载控制
    async downloadWithConcurrency(attachments, dirHandle) {
        // 预先分析命名策略（如果启用了auto模式）0
        let namingStrategy = null;
        const validation = this.downloadSettings.fileNaming.validation;
        if (validation?.enabled && validation.fallbackPattern === 'auto') {
            namingStrategy = this.analyzeAttachmentNaming(attachments, validation.pattern);
        }

        const results = [];
        const tasks = attachments.map(attachment => ({
            attachment, status: 'pending', retries: 0, namingStrategy
        }));

        this.totalTasksForProgress = tasks.length;
        this.completedTasksForProgress = 0;
        this.downloadStats = {
            startTime: Date.now(),
            completedSize: 0,
            totalSize: attachments.reduce((sum, att) => sum + (att.size || 0), 0),
            speed: 0,
            lastUpdate: Date.now()
        };

        // 根据用户设置决定使用动态并发还是固定并发
        const concurrentSetting = this.downloadSettings.downloadBehavior.concurrentDownloads;
        const useAutoMode = concurrentSetting === 'auto';
        const maxConcurrent = useAutoMode ? this.concurrentControl.currentConcurrent : parseInt(concurrentSetting) || 3;
        
        const activeDownloads = new Set();

        const processNext = async () => {
            // 检查是否超过并发限制
            const currentLimit = useAutoMode ? this.concurrentControl.currentConcurrent : maxConcurrent;
            if (activeDownloads.size >= currentLimit) {
                return;
            }
            
            const pendingTask = tasks.find(t => t.status === 'pending');
            if (!pendingTask) return;

            pendingTask.status = 'processing';
            const downloadPromise = this.downloadAttachment(pendingTask.attachment, dirHandle, pendingTask.namingStrategy)
                .then(() => {
                    pendingTask.status = 'completed';
                    results.push({ attachment: pendingTask.attachment, error: null });
                    this.completedTasksForProgress++;
                    
                    // 更新下载统计数据
                    const attachmentSize = pendingTask.attachment.size || 0;
                    this.updateDownloadStats(attachmentSize);
                    this.updateDownloadProgress();
                    
                    // 更新成功统计并调整并发数（仅在自动模式下）
                    if (useAutoMode) {
                        this.concurrentControl.successCount++;
                        this.adjustConcurrency();
                    }
                    
                    activeDownloads.delete(downloadPromise);
                    
                    // 尝试启动更多任务
                    const currentLimit = useAutoMode ? this.concurrentControl.currentConcurrent : maxConcurrent;
                    while (activeDownloads.size < currentLimit && 
                           tasks.some(t => t.status === 'pending')) {
                        processNext();
                    }
                })
                .catch(error => {
                    if (pendingTask.retries < this.retryCount) {
                        pendingTask.retries++;
                        pendingTask.status = 'pending';
                        activeDownloads.delete(downloadPromise);
                        
                        // 重试时也要考虑并发限制
                        const currentLimit = useAutoMode ? this.concurrentControl.currentConcurrent : maxConcurrent;
                        while (activeDownloads.size < currentLimit && 
                               tasks.some(t => t.status === 'pending')) {
                            processNext();
                        }
                    } else {
                        pendingTask.status = 'failed';
                        results.push({ attachment: pendingTask.attachment, error });
                        this.completedTasksForProgress++;
                        this.updateDownloadProgress();
                        
                        // 更新失败统计并调整并发数（仅在自动模式下）
                        if (useAutoMode) {
                            this.concurrentControl.failCount++;
                            this.adjustConcurrency();
                        }
                        
                        activeDownloads.delete(downloadPromise);
                        
                        // 尝试启动更多任务
                        const currentLimit = useAutoMode ? this.concurrentControl.currentConcurrent : maxConcurrent;
                        while (activeDownloads.size < currentLimit && 
                               tasks.some(t => t.status === 'pending')) {
                            processNext();
                        }
                    }
                });

            activeDownloads.add(downloadPromise);
        };

        // 启动初始下载任务
        const initialConcurrent = Math.min(maxConcurrent, tasks.length);
        for (let i = 0; i < initialConcurrent; i++) {
            processNext();
        }

        // 等待所有下载完成
        while (activeDownloads.size > 0) {
            await Promise.race(activeDownloads);
        }

        return results;
    }



    // 动态调整并发数
    adjustConcurrency() {
        const now = Date.now();
        if (!this.concurrentControl.lastAdjustTime ||
            now - this.concurrentControl.lastAdjustTime >= this.concurrentControl.adjustInterval) {

            const totalCount = this.concurrentControl.successCount + this.concurrentControl.failCount;
            if (totalCount === 0) return; // 没有足够的数据进行调整

            const successRate = this.concurrentControl.successCount / totalCount;
            const oldConcurrent = this.concurrentControl.currentConcurrent;

            if (successRate > 0.9) {
                // 成功率很高，可以增加并发
                this.concurrentControl.currentConcurrent = Math.min(
                    this.concurrentControl.currentConcurrent + 1,
                    this.concurrentControl.maxConcurrent
                );
            } else if (successRate < 0.7) {
                // 成功率较低，减少并发
                this.concurrentControl.currentConcurrent = Math.max(
                    this.concurrentControl.currentConcurrent - 1,
                    this.concurrentControl.minConcurrent
                );
            }

            // 如果并发数发生变化，显示调整信息
            if (this.concurrentControl.currentConcurrent !== oldConcurrent) {
                console.log(`[动态并发] 成功率: ${(successRate * 100).toFixed(1)}%, 并发数: ${oldConcurrent} → ${this.concurrentControl.currentConcurrent}`);
            }

            // 重置计数器
            this.concurrentControl.successCount = 0;
            this.concurrentControl.failCount = 0;
            this.concurrentControl.lastAdjustTime = now;
        }
    }

    // 更新下载统计
    updateDownloadStats(completedSize) {
        const now = Date.now();
        
        // 初始化时间戳
        if (!this.downloadStats.lastUpdate) {
            this.downloadStats.lastUpdate = this.downloadStats.startTime || now;
        }
        
        const timeDiff = (now - this.downloadStats.lastUpdate) / 1000; // 转换为秒
        const totalElapsed = (now - this.downloadStats.startTime) / 1000; // 总耗时

        this.downloadStats.completedSize += completedSize;
        this.downloadStats.lastUpdate = now;

        // 计算平均速度（基于总体进度，更稳定）
        if (totalElapsed > 0) {
            this.downloadStats.speed = this.downloadStats.completedSize / totalElapsed;
        }

        // 更新状态显示
        this.updateStatus(`下载中: ${this.formatData(this.downloadStats.completedSize, 'size')} / ${this.formatData(this.downloadStats.totalSize, 'size')} ` +
        `(${this.formatData(this.downloadStats.speed, 'size')}/s)`
        );
    }

    // 智能分组附件
    // 优化的智能分组算法（减少重复计算）
    groupAttachmentsSmartly(attachments) {
        const smartGroupingConfig = this.downloadSettings.smartGrouping;
        if (!smartGroupingConfig.enabled) {
            return this.groupAttachmentsByMail(attachments);
        }

        const groups = new Map();
        const { minGroupSize, maxGroupSize, groupBy } = smartGroupingConfig;

        // 预计算分组键生成器
        const keyGenerators = groupBy.map(criteria => {
            switch (criteria) {
                case 'type': return att => this.getFileType(att.name);
                case 'date': return att => {
                    const timestamp = att.date || att.totime;
                    if (timestamp) {
                        const date = new Date(typeof timestamp === 'number' && timestamp < 10000000000 ? timestamp * 1000 : timestamp);
                        return !isNaN(date.getTime()) ? this.formatDate(date, 'YYYYMMDD') : '';
                    }
                    return '';
                };
                case 'sender': return att => att.sender;
                default: return () => '';
            }
        });

        // 单次遍历生成分组
        attachments.forEach(attachment => {
            const groupKey = keyGenerators.map(gen => gen(attachment)).filter(Boolean).join('_');

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    key: groupKey,
                    attachments: [],
                    type: this.getFileType(attachment.name),
                    date: attachment.date,
                    sender: attachment.sender
                });
            }
            groups.get(groupKey).attachments.push(attachment);
        });

        // 批量处理分组大小
        const result = [];
        for (const group of groups.values()) {
            if (group.attachments.length >= minGroupSize && group.attachments.length <= maxGroupSize) {
                result.push(group);
            } else {
                result.push(...this.groupAttachmentsByMail(group.attachments));
            }
        }

        return result;
    }



    // 优化的命名模式解析
    parseNamingPattern(pattern, attachment) {
        if (!pattern || !attachment) return '';

        const replacements = {
            name: attachment.name,
            fileName: attachment.name,
            mailSubject: this.sanitizeFileName(attachment.mailSubject || '', attachment),
            subject: this.sanitizeFileName(attachment.mailSubject || '', attachment),
            sender: this.sanitizeFileName(attachment.senderName || attachment.sender || '', attachment),
            senderEmail: attachment.sender || '',
            mailId: attachment.mailId,
            attachmentId: attachment.fid,
            date: attachment.totime ? this.formatDate(new Date(typeof attachment.totime === 'number' && attachment.totime < 10000000000 ? attachment.totime * 1000 : attachment.totime), 'YYYYMMDD') : '',
            toTime: attachment.totime ? this.formatDate(new Date(typeof attachment.totime === 'number' && attachment.totime < 10000000000 ? attachment.totime * 1000 : attachment.totime), 'YYYYMMDDHHmmss') : '',
            fileType: this.processFileName(attachment.name, 'getExtension'),
            size: attachment.size ? this.formatData(attachment.size, 'size') : ''
        };

        return pattern.replace(/\{(\w+)\}/g, (match, key) => replacements[key] || match);
    }

    // 生成备用命名前缀
    generateFallbackPrefix(fallbackPattern, attachment) {
        if (!fallbackPattern || !attachment) return '';

        switch (fallbackPattern) {
            case 'mailSubject':
                return this.sanitizeFileName(attachment.mailSubject || '', attachment);
            case 'senderEmail':
                return this.sanitizeFileName(attachment.sender || '', attachment);
            case 'toTime':
                return attachment.totime ? this.formatDate(new Date(typeof attachment.totime === 'number' && attachment.totime < 10000000000 ? attachment.totime * 1000 : attachment.totime), 'YYYYMMDDHHmmss') : '';
            case 'customTemplate':
                // 这个会在后面的逻辑中处理
                return '';
            case 'auto':
            default:
                return '';
        }
    }

    // 优化的智能命名分析（减少重复过滤和计算）
    analyzeAttachmentNaming(attachments, validationPattern) {
        if (!attachments?.length) return { strategy: 'default', prefix: '' };

        // 创建正则表达式
        let regex;
        try {
            regex = new RegExp(validationPattern);
        } catch (error) {
            return { strategy: 'default', prefix: '' };
        }

        // 单次遍历分析附件
        const validAttachments = [];
        for (const att of attachments) {
            if (regex.test(att.name)) validAttachments.push(att);
        }

        const validCount = validAttachments.length;

        // 情况1：只有1个附件，或者全部不满足正则
        if (attachments.length === 1 || validCount === 0) {
            return { strategy: 'mailSubject', prefix: '' };
        }

        // 情况2：数量大于2张，且大于1张满足匹配
        if (attachments.length >= 2 && validCount > 1) {
            const commonPrefix = this.findCommonPrefix(validAttachments.map(att => att.name));
            if (commonPrefix?.length > 0) {
                return { strategy: 'commonPrefix', prefix: commonPrefix };
            }
        }

        // 情况3：只有1个满足匹配
        if (validCount === 1) {
            const extractedPrefix = this.extractNamingPattern(validAttachments[0].name);
            if (extractedPrefix) {
                return { strategy: 'extractedPattern', prefix: extractedPrefix };
            }
        }

        // 默认策略
        return { strategy: 'mailSubject', prefix: '' };
    }

    // 优化的公共前缀查找算法
    findCommonPrefix(fileNames) {
        if (!fileNames?.length || fileNames.length < 2) return '';

        const separators = new Set(['+', '-', '_', ' ', '.', '(', ')', '[', ']']);
        let prefix = fileNames[0];

        // 逐个比较，提前退出优化
        for (let i = 1; i < fileNames.length && prefix.length > 0; i++) {
            const current = fileNames[i];
            const minLen = Math.min(prefix.length, current.length);
            let j = 0;

            while (j < minLen && prefix[j] === current[j]) j++;
            prefix = prefix.substring(0, j);
        }

        // 找到最后一个分隔符位置
        const lastSepIndex = [...prefix].findLastIndex(char => separators.has(char));
        return lastSepIndex > 0 ? prefix.substring(0, lastSepIndex + 1) : prefix;
    }

    // 从单个文件名中提取命名模式
    extractNamingPattern(fileName) {
        // 匹配模式：{任意?}{分隔符?}{数字}{分隔符?}{数字?}{分隔符?}{任意?}
        // 例如：作者+123456+123456789+作品1.jpg -> 作者+123456+123456789+

        const patterns = [
            // 模式1: 前缀+数字+数字+后缀 (如: 作者+123456+123456789+作品1.jpg)
            /^(.+?[+\-_\s])(\d+)([+\-_\s])(\d+)([+\-_\s]).*/,
            // 模式2: 前缀+数字+后缀 (如: 作者+123456+作品1.jpg)
            /^(.+?[+\-_\s])(\d+)([+\-_\s]).*/,
            // 模式3: 前缀+数字 (如: 作者123456作品1.jpg)
            /^(.+?)(\d{6,}).*/
        ];

        for (const pattern of patterns) {
            const match = fileName.match(pattern);
            if (match) {
                if (pattern === patterns[0]) {
                    // 包含两个数字的情况：返回到第二个数字后的分隔符
                    return match[1] + match[2] + match[3] + match[4] + match[5];
                } else if (pattern === patterns[1]) {
                    // 包含一个数字的情况：返回到数字后的分隔符
                    return match[1] + match[2] + match[3];
                } else {
                    // 简单数字匹配：尝试找到数字前的合理分割点
                    const beforeNumber = match[1];
                    const number = match[2];
                    // 寻找最后一个可能的分隔符
                    const separators = ['+', '-', '_', ' '];
                    for (let i = beforeNumber.length - 1; i >= 0; i--) {
                        if (separators.includes(beforeNumber[i])) {
                            return beforeNumber.substring(0, i + 1) + number;
                        }
                    }
                    return beforeNumber + number;
                }
            }
        }

        return '';
    }

    // 生成文件名（支持智能auto模式）
    generateFileName(attachment, fileNamingConfig, allAttachments = null, namingStrategy = null) {
        // 如果没有配置，直接返回清理后的原文件名
        if (!fileNamingConfig) {
            return this.processFileName(attachment.name, 'sanitize', attachment);
        }

        let fileName = attachment.name;
        let needsFallback = false;

        // 检查是否启用了验证功能
        if (fileNamingConfig.validation && fileNamingConfig.validation.enabled && fileNamingConfig.validation.pattern) {
            try {
                const regex = new RegExp(fileNamingConfig.validation.pattern);
                const isValid = regex.test(attachment.name);
                needsFallback = !isValid;
            } catch (error) {
                // 静默忽略正则表达式错误
                needsFallback = false;
            }
        }

        // 按照指定顺序构建文件名：1. 命名策略 2. 备用命名前缀 3. 前缀、后缀
        const parts = [];
        const ext = this.processFileName(attachment.name, 'getExtension');
        let baseFileName = this.processFileName(attachment.name, 'removeExtension');

        // 1. 命名策略（自定义模式或原始文件名）
        if (fileNamingConfig.useCustomPattern && fileNamingConfig.customPattern) {
            // 使用自定义命名模板
            baseFileName = this.parseNamingPattern(fileNamingConfig.customPattern, attachment);
        } else if (needsFallback && fileNamingConfig.validation.fallbackPattern) {
            // 需要使用备用命名策略
            if (fileNamingConfig.validation.fallbackPattern === 'auto') {
                // 使用智能auto模式
                return this.generateAutoFileName(attachment, fileNamingConfig, allAttachments, namingStrategy);
            } else if (fileNamingConfig.validation.fallbackPattern === 'customTemplate' && fileNamingConfig.validation.fallbackTemplate) {
                // 使用自定义备用模板
                baseFileName = this.parseNamingPattern(fileNamingConfig.validation.fallbackTemplate, attachment);
            } else {
                // 使用其他备用策略
                const fallbackPrefix = this.generateFallbackPrefix(fileNamingConfig.validation.fallbackPattern, attachment);
                if (fallbackPrefix) {
                    baseFileName = fallbackPrefix + '_' + baseFileName;
                }
            }
        }
        // 如果不使用自定义模式且不需要备用策略，则使用原始文件名（已在上面设置）

        // 2. 备用命名前缀（如果启用了验证且需要备用策略，但不是auto或customTemplate）
        if (needsFallback && fileNamingConfig.validation.fallbackPattern && 
            fileNamingConfig.validation.fallbackPattern !== 'auto' && 
            fileNamingConfig.validation.fallbackPattern !== 'customTemplate') {
            const fallbackPrefix = this.generateFallbackPrefix(fileNamingConfig.validation.fallbackPattern, attachment);
            if (fallbackPrefix && !baseFileName.startsWith(fallbackPrefix)) {
                parts.push(fallbackPrefix);
            }
        }

        // 3. 前缀、后缀
        if (fileNamingConfig.prefix) {
            parts.push(fileNamingConfig.prefix);
        }

        // 添加基础文件名
        if (baseFileName) {
            parts.push(baseFileName);
        }

        // 后缀
        if (fileNamingConfig.suffix) {
            parts.push(fileNamingConfig.suffix);
        }

        // 合并文件名
        if (parts.length > 0) {
            const separator = fileNamingConfig.separator || '_';
            const finalBaseName = parts.join(separator);
            fileName = ext ? `${finalBaseName}.${ext}` : finalBaseName;
        } else {
            // 如果没有任何部分，使用原始文件名
            fileName = attachment.name;
        }

        return this.processFileName(fileName, 'sanitize', attachment);
    }

    // 生成智能auto模式文件名
    generateAutoFileName(attachment, fileNamingConfig, allAttachments, namingStrategy) {
        if (!namingStrategy) {
            // 如果没有提供策略，需要分析所有附件
            if (!allAttachments) {
                // 按照新的命名顺序构建默认文件名
                const parts = [];
                const ext = this.processFileName(attachment.name, 'getExtension');
                
                // 备用命名前缀（邮件主题）
                if (attachment.mailSubject) {
                    parts.push(attachment.mailSubject);
                }
                
                // 前缀
                if (fileNamingConfig.prefix) {
                    parts.push(fileNamingConfig.prefix);
                }
                
                // 基础文件名
                const baseFileName = this.processFileName(attachment.name, 'removeExtension');
                if (baseFileName) {
                    parts.push(baseFileName);
                }
                
                // 后缀
                if (fileNamingConfig.suffix) {
                    parts.push(fileNamingConfig.suffix);
                }
                
                const separator = fileNamingConfig.separator || '_';
                const finalBaseName = parts.join(separator);
                const finalName = ext ? `${finalBaseName}.${ext}` : finalBaseName;
                
                return this.processFileName(finalName, 'sanitize', attachment);
            }
            namingStrategy = this.analyzeAttachmentNaming(allAttachments, fileNamingConfig.validation.pattern);
        }

        // 确保附件对象有预计算的字段（兼容性检查）
        if (!attachment.nameWithoutExt) {
            attachment.nameWithoutExt = this.processFileName(attachment.name, 'removeExtension');
        }
        if (!attachment.ext) {
            attachment.ext = this.processFileName(attachment.name, 'getExtension');
        }

        // 按照新的命名顺序构建文件名
        const parts = [];
        let baseFileName = '';

        // 1. 命名策略（智能分析结果）
        switch (namingStrategy.strategy) {
            case 'mailSubject':
                // 使用邮件主题+文件名
                baseFileName = `${attachment.mailSubject}_${attachment.nameWithoutExt}`;
                break;

            case 'commonPrefix':
                // 使用公共前缀+原文件名去掉公共部分
                const remainingName = attachment.name.startsWith(namingStrategy.prefix)
                    ? attachment.name.substring(namingStrategy.prefix.length)
                    : attachment.name;
                const remainingWithoutExt = this.processFileName(remainingName, 'removeExtension');
                baseFileName = `${namingStrategy.prefix}${remainingWithoutExt}`;
                break;

            case 'extractedPattern':
                // 使用提取的模式+原文件名的后缀部分
                if (attachment.nameWithoutExt.startsWith(namingStrategy.prefix)) {
                    const suffix = attachment.nameWithoutExt.substring(namingStrategy.prefix.length);
                    baseFileName = `${namingStrategy.prefix}${suffix}`;
                } else {
                    baseFileName = `${namingStrategy.prefix}${attachment.nameWithoutExt}`;
                }
                break;

            default:
                // 默认使用邮件主题+文件名
                baseFileName = `${attachment.mailSubject}_${attachment.nameWithoutExt}`;
                break;
        }

        // 2. 备用命名前缀（已在策略中处理）
        // 3. 前缀、后缀
        if (fileNamingConfig.prefix) {
            parts.push(fileNamingConfig.prefix);
        }

        // 添加基础文件名
        if (baseFileName) {
            parts.push(baseFileName);
        }

        // 后缀
        if (fileNamingConfig.suffix) {
            parts.push(fileNamingConfig.suffix);
        }

        // 合并文件名
        const separator = fileNamingConfig.separator || '_';
        const finalBaseName = parts.length > 0 ? parts.join(separator) : baseFileName;
        const finalName = attachment.ext ? `${finalBaseName}.${attachment.ext}` : finalBaseName;
        const sanitizedName = this.processFileName(finalName, 'sanitize', attachment);
        
        // 验证文件名是否符合正则表达式
        if (!this.validateFileName(sanitizedName)) {
            console.log(`文件名 "${sanitizedName}" 不符合验证规则，使用备用策略`);
            return this.generateFallbackFileName(sanitizedName, attachment);
        }
        
        return sanitizedName;
    }

    // 文件工具方法集合
    // 统一文件名处理工具
    processFileName(fileName, operation, attachment = null) {
        switch (operation) {
            case 'removeExtension':
                const lastDotIndex = fileName.lastIndexOf('.');
                return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
            case 'getExtension':
                const match = fileName.match(/\.([^.]+)$/);
                return match ? match[1].toLowerCase() : null;
            case 'sanitize':
                return this.sanitizeFileName(fileName, attachment);
            default:
                return fileName;
        }
    }

    // 文件名规范检查和清理方法
    sanitizeFileName(fileName, attachment = null) {
        const validation = this.downloadSettings.fileNaming.validation;
        
        // 如果未启用验证，使用基本清理
        if (!validation?.enabled) {
            return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim();
        }

        let cleanName = fileName;
        
        // 应用内容替换规则
        cleanName = this.applyContentReplacement(cleanName, attachment);

        const replacementChar = validation.replacementChar || '_';
        const removeInvalidChars = validation.removeInvalidChars !== false;

        // 移除系统禁用字符
        if (removeInvalidChars) {
            cleanName = cleanName.replace(/[<>:"/\\|?*\x00-\x1f]/g, replacementChar);
        }

        // 清理多余的空格和替换字符
        cleanName = cleanName.replace(/\s+/g, ' ').trim();
        
        // 移除连续的替换字符
        if (replacementChar && replacementChar !== ' ') {
            const escapedChar = replacementChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const duplicatePattern = new RegExp(`${escapedChar}{2,}`, 'g');
            cleanName = cleanName.replace(duplicatePattern, replacementChar);
        }

        // 清理首尾的特殊字符
        cleanName = cleanName.replace(/^[._\-\s]+|[._\-\s]+$/g, '');

        // 确保文件名不为空
        if (!cleanName || cleanName.trim() === '') {
            cleanName = 'unnamed_file';
        }

        return cleanName;
    }

    // 应用内容替换规则
    applyContentReplacement(fileName, attachment = null) {
        const validation = this.downloadSettings.fileNaming.validation;
        const contentReplacement = validation?.contentReplacement;
        
        // 如果未启用内容替换或没有搜索内容，直接返回原文件名
        if (!contentReplacement?.enabled || !contentReplacement.search) {
            return fileName;
        }
        
        try {
            let result = fileName;
            let searchPattern = contentReplacement.search;
            let replaceContent = contentReplacement.replace ?? '';
            
            // 如果有附件信息，替换变量
            if (attachment && replaceContent.includes('{')) {
                replaceContent = this.parseNamingPattern(replaceContent, attachment);
            }
            
            if (contentReplacement.mode === 'regex') {
                // 正则表达式模式
                const flags = contentReplacement.global ? 'g' : '';
                const caseFlags = contentReplacement.caseSensitive ? '' : 'i';
                const regex = new RegExp(searchPattern, flags + caseFlags);
                result = result.replace(regex, replaceContent);
            } else {
                // 字符串模式
                if (contentReplacement.global) {
                    // 全局替换
                    if (contentReplacement.caseSensitive) {
                        // 区分大小写
                        while (result.includes(searchPattern)) {
                            result = result.replace(searchPattern, replaceContent);
                        }
                    } else {
                        // 不区分大小写
                        const regex = new RegExp(searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        result = result.replace(regex, replaceContent);
                    }
                } else {
                    // 只替换第一个匹配项
                    if (contentReplacement.caseSensitive) {
                        const index = result.indexOf(searchPattern);
                        if (index !== -1) {
                            result = result.substring(0, index) + replaceContent + result.substring(index + searchPattern.length);
                        }
                    } else {
                        const lowerResult = result.toLowerCase();
                        const lowerSearch = searchPattern.toLowerCase();
                        const index = lowerResult.indexOf(lowerSearch);
                        if (index !== -1) {
                            result = result.substring(0, index) + replaceContent + result.substring(index + searchPattern.length);
                        }
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.warn('内容替换失败:', error);
            return fileName; // 如果替换失败，返回原文件名
        }
    }

    // 验证文件名是否符合正则表达式
    validateFileName(fileName) {
        const validation = this.downloadSettings.fileNaming.validation;
        
        if (!validation?.enabled || !validation.pattern) {
            return true;
        }

        try {
            const regex = new RegExp(validation.pattern);
            const nameWithoutExt = this.processFileName(fileName, 'removeExtension');
            return regex.test(nameWithoutExt);
        } catch (error) {
            console.warn('正则表达式验证失败:', error);
            return true; // 如果正则表达式有问题，默认通过验证
        }
    }

    // 根据备用策略生成文件名
    generateFallbackFileName(originalFileName, attachment) {
        const validation = this.downloadSettings.fileNaming.validation;
        const fallbackPattern = validation?.fallbackPattern || 'auto';
        const ext = this.processFileName(originalFileName, 'getExtension');
        
        let newName;
        
        switch (fallbackPattern) {
            case 'mailSubject':
                newName = attachment.mailSubject || attachment.subject || 'untitled';
                break;
            case 'senderEmail':
                newName = attachment.sender || 'unknown_sender';
                break;
            case 'toTime':
                newName = attachment.totime ? this.formatDate(new Date(typeof attachment.totime === 'number' && attachment.totime < 10000000000 ? attachment.totime * 1000 : attachment.totime), 'YYYYMMDDHHmmss') : Date.now().toString();
                break;
            case 'customTemplate':
                // 使用自定义模板
                const template = validation?.fallbackTemplate || '{subject}_{fileName}';
                newName = this.parseNamingPattern(template, attachment);
                break;
            case 'auto':
            default:
                // 智能分析：尝试提取有意义的部分
                const nameWithoutExt = this.processFileName(originalFileName, 'removeExtension');
                const numbers = nameWithoutExt.match(/\d+/g);
                const letters = nameWithoutExt.match(/[a-zA-Z\u4e00-\u9fff]+/g);
                
                if (numbers && numbers.length > 0) {
                    newName = numbers.join('_');
                } else if (letters && letters.length > 0) {
                    newName = letters.slice(0, 3).join('_');
                } else {
                    newName = attachment.mailSubject || attachment.subject || `file_${Date.now()}`;
                }
                break;
        }
        
        // 清理生成的文件名
        newName = this.sanitizeFileName(newName, attachment);
        
        return ext ? `${newName}.${ext}` : newName;
    }

    // 统一文件夹选择方法
    async selectDownloadFolder() {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
        const permissionStatus = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (permissionStatus !== 'granted') {
            throw new Error('需要文件夹写入权限才能下载文件');
        }
        return dirHandle;
    }



    // 通用的变量替换函数，用于预览和实际文件名生成
    replaceVariablesInTemplate(template, variableData) {
        if (!template || !variableData) return template;
        let result = template;
        
        // 处理带格式的变量，如 {date:YYYY-MM}
        result = result.replace(/\{(\w+):([^}]+)\}/g, (match, varName, format) => {
            if (varName === 'date' && variableData.date) {
                // 处理日期格式化
                const mailDate = variableData.date instanceof Date ? variableData.date : 
                    new Date(typeof variableData.date === 'number' && variableData.date < 10000000000 ? 
                        variableData.date * 1000 : variableData.date);
                if (mailDate && !isNaN(mailDate.getTime())) {
                    return this.formatDate(mailDate, format);
                }
            }
            return match; // 如果无法处理，保持原样
        });
        
        // 处理普通变量，如 {senderName}
        result = result.replace(/\{(\w+)\}/g, (match, varName) => {
            const value = variableData[varName];
            return (value !== undefined && value !== null) ? String(value) : match;
        });
        
        return result;
    }

    // 优化的自定义变量处理（减少正则表达式创建）
    processCustomVariables(variables, attachment) {
        if (!variables?.length) return {};

        const result = {};
        const attachmentEntries = Object.entries(attachment);

        variables.forEach(variable => {
            if (variable.name && variable.value) {
                let value = variable.value;
                // 批量替换，避免重复创建正则表达式
                attachmentEntries.forEach(([key, val]) => {
                    if (value.includes(`{${key}}`)) {
                        value = value.replaceAll(`{${key}}`, val ?? '');
                    }
                });
                result[variable.name] = value;
            }
        });
        return result;
    }

    async getOrCreateFolder(parentHandle, folderName) {
        try {
            return await parentHandle.getDirectoryHandle(folderName, { create: true });
        } catch (error) {
            throw error;
        }
    }

    formatDate(dateOrTimestamp, format) {
        if (arguments.length === 1) {
            const date = this.processData(dateOrTimestamp, 'createSafeDate');
            if (!date) return '';
                return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }

        const pad = (num) => String(num).padStart(2, '0');
        let date = dateOrTimestamp instanceof Date ? dateOrTimestamp : this.processData(dateOrTimestamp, 'createSafeDate');

        if (!date || isNaN(date.getTime())) {
            return '';
        }

        if (!format || typeof format !== 'string') {
            return '';
        }

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hour24 = pad(date.getHours());
        const hour12 = pad(date.getHours() % 12 || 12);
        const minute = pad(date.getMinutes());
        const second = pad(date.getSeconds());

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hour24)
            .replace('hh', hour12)
            .replace('mm', minute)
            .replace('ss', second);
    }


    getSmartGroupName(attachment) {
        const parts = [];
        const smartGroupingConfig = this.downloadSettings.smartGrouping;

        if (smartGroupingConfig.groupByType) {
            const fileType = this.getFileType(attachment.name);
            if (fileType) {
                parts.push(fileType.toUpperCase());
            }
        }

        if (smartGroupingConfig.groupByDate) {
            const timestamp = attachment.date || attachment.totime || attachment.mailDate;
            if (timestamp) {
                const date = this.normalizeTimestamp(timestamp);
                if (date && !isNaN(date.getTime())) {
                    parts.push(this.formatDate(date, 'YYYY-MM'));
                }
            }
        }

        return parts.length > 0 ? parts.join('_') : null;
    }

    static async _asyncRetry(asyncFn, argsArray, maxRetries, delayMs, retryIdentifier = 'Unnamed Task') {
        let attempts = 0;
        while (attempts <= maxRetries) { // Note: attempts <= maxRetries for initial + maxRetries
            try {
                if (attempts > 0) { // Delay only for actual retries
                    console.log(`[AsyncRetry] Retrying ${retryIdentifier}, attempt ${attempts} of ${maxRetries} after ${delayMs}ms delay...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                return await asyncFn(...argsArray);
            } catch (error) {
                    console.warn(`[AsyncRetry] Attempt ${attempts + 1} for ${retryIdentifier} failed:`, error.message);
                attempts++; // Increment after logging the current attempt that failed
                if (attempts > maxRetries) {
                    console.error(`[AsyncRetry] All ${maxRetries + 1} attempts for ${retryIdentifier} (initial + ${maxRetries} retries) failed.`);
                    throw error; // Re-throw the last error
                }
            }
        }
    }

    updateMailCount(filteredAttachments) {
        const attachmentList = filteredAttachments || this.attachments;
        const { mailIds, totalSize } = attachmentList.reduce((acc, att) => {
            if (att.mailId) acc.mailIds.add(att.mailId);
            if (att.size) acc.totalSize += att.size;
            return acc;
        }, { mailIds: new Set(), totalSize: 0 });

        // 优先使用API返回的总邮件数，如果没有则使用计算的邮件数
        const mailCount = this.totalMailCount || mailIds.size;
        const totalAttachmentCount = this.attachments ? this.attachments.length : 0;
        const statsText = `${mailCount} 封邮件 · ${totalAttachmentCount} 个附件${totalSize > 0 ? ` · ${this.formatData(totalSize, 'size')}` : ''}`;

        // 更新标题栏中的统计信息
        const headerInfo = document.getElementById('attachment-count-info');
        if (headerInfo) {
            headerInfo.textContent = statsText;
        }

        // 兼容旧的元素ID
        ['folder-stats'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = statsText;
        });

        const mailCountElem = document.getElementById('mail-count');
        if (mailCountElem) mailCountElem.textContent = `${mailCount} 封邮件`;
    }

    updateAttachmentList(attachments) {
        if (!this.attachmentList) return;

        this.attachmentList.innerHTML = '';

        // 更新统计信息
        this.updateMailCount(attachments);

        if (attachments.length === 0) {
            const emptyState = this.createUI('div', {
                content: `
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 16px;">
                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 2V8H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div>暂无附件</div>
                `,
                styles: StyleManager.getStyles().states.empty
            });
            this.attachmentList.appendChild(emptyState);
            return;
        }

        attachments.forEach(attachment => {
            const card = this.createAttachmentCard(attachment);
            this.attachmentList.appendChild(card);
        });
    }

    toggleAttachmentManager() {
        // 防抖机制，避免快速重复点击
        if (this.toggleInProgress) {
            console.log('[切换面板] 操作正在进行中，忽略重复点击');
            return;
        }
        
        this.toggleInProgress = true;
        console.log('[切换面板] 开始切换附件管理面板，当前状态:', this.isViewActive ? '激活' : '未激活');
        
        try {
            if (this.isViewActive) {
                this.hideAttachmentView();
            } else {
                this.initializeAttachmentView();
            }
        } finally {
            // 延迟重置防抖标志，避免操作过快
            setTimeout(() => {
                this.toggleInProgress = false;
                console.log('[切换面板] 防抖标志已重置');
            }, 1000);
        }
    }

    async initializeAttachmentView() {
        if (this.isViewActive) {
            console.log('[初始化] 面板已激活，跳过重复初始化');
            return;
        }

        console.log('[初始化] 开始初始化附件视图');
        
        try {
            await this.prepareForInitialization();
            await this.setupUserInterface();
            await this.loadAttachmentData();
            await this.completeInitialization();
            console.log('[初始化] 附件视图初始化完成');
        } catch (error) {
            console.error('[初始化] 初始化失败:', error);
            this.handleInitializationError(error);
        }
    }

    // 准备初始化 - 检查前置条件和清理状态
    async prepareForInitialization() {
        console.log('[准备初始化] 开始准备初始化');
        
        // 检查前置条件
        const sid = this.downloader.sid;
        if (!sid) {
            throw new Error('SID为空，请确保已正确登录');
        }

        const folderId = this.downloader.getCurrentFolderId();
        if (!folderId) {
            throw new Error('无法获取当前文件夹ID');
        }

        // 清理之前的状态
        this.cleanupPreviousState();

        // 设置基础状态
        this.isViewActive = true;
        this.currentFolderId = folderId;
        this.isLoading = true;
        this.attachments = [];
        this.selectedAttachments.clear();
        
        console.log('[准备初始化] 初始化准备完成，文件夹ID:', folderId);
    }

    // 界面初始化 - 创建UI和显示加载状态
    async setupUserInterface() {
        console.log('[界面初始化] 开始创建用户界面');
        
        // 创建覆盖面板
        this.createOverlayPanel();

        // 显示初始加载状态
        const container = document.querySelector('#attachment-content-area');
        if (container) {
            this.showState('loading', '正在初始化附件管理器...', container);
        }

        // 设置全局键盘监听
        this.addGlobalKeyListener();

        // 更新工具栏状态
        this.updateStatus('正在准备加载附件...');
        
        console.log('[界面初始化] 用户界面创建完成');
    }

    async loadAttachmentData() {
        const container = document.querySelector('#attachment-content-area');
        this.showState('loading', '正在获取邮件列表...', container);
        
        // 首先获取第一页，同时获取总邮件数
        const firstPageResult = await this.downloader.fetchMailList(this.currentFolderId, 0, 50);
        const totalMailCount = firstPageResult.total;
        const firstPageMails = firstPageResult.mails;
        
        if (!firstPageMails.length) {
            this.attachments = [];
            this.totalMailCount = 0;
            return;
        }

        // 保存总邮件数
        this.totalMailCount = totalMailCount;
        
        // 如果总邮件数大于50，需要获取剩余的邮件
        let allMails = [...firstPageMails];
        
        if (totalMailCount > 50) {
            this.showState('loading', `正在获取 ${totalMailCount} 封邮件...`, container);
            
            // 计算需要获取的页数
            const totalPages = Math.ceil(totalMailCount / 50);
            
            // 并行获取剩余页面
            const pagePromises = [];
            for (let page = 1; page < totalPages; page++) {
                pagePromises.push(this.downloader.fetchMailList(this.currentFolderId, page, 50));
            }
            
            try {
                const results = await Promise.all(pagePromises);
                results.forEach(result => {
                    if (result.mails && result.mails.length > 0) {
                        allMails.push(...result.mails);
                    }
                });
            } catch (error) {
                console.error('[获取邮件] 获取剩余页面失败:', error);
                this.showToast('部分邮件获取失败，将处理已获取的邮件', 'warning');
            }
        }

        this.showState('loading', `正在处理 ${allMails.length} 封邮件...`, container);
        this.attachments = [];
        await this.processMailsInBatches(allMails, this.currentFolderId);
    }

    async completeInitialization() {
        this.displayAttachments(this.attachments);
        this.updateMailCount(this.attachments);
        this.updateStatus(`共 ${this.totalMailCount} 封邮件，包含 ${this.attachments.length} 个附件。`);
        this.updateSmartDownloadButton();
        this.isLoading = false;
    }

    // 清理之前的状态
    cleanupPreviousState() {
        // 清理选中状态
        this.selectedAttachments.clear();

        // 清理引用
        this.smartDownloadButton = null;
        this.overlayPanel = null;

        // 清理定时器
        if (this.downloadProgressTimer) {
            clearInterval(this.downloadProgressTimer);
            this.downloadProgressTimer = null;
        }

        // 移除可能遗留的UI元素
        const existingOverlays = document.querySelectorAll('#attachment-manager-overlay');
        existingOverlays.forEach(overlay => overlay.remove());

        // 移除Toast和菜单
        const toasts = document.querySelectorAll('.attachment-toast, .attachment-menu, .attachment-dialog');
        toasts.forEach(toast => toast.remove());
    }

    // 处理初始化错误
    handleInitializationError(error) {
        console.error('[错误处理] 处理初始化错误:', error);
        
        // 重置状态
        this.isViewActive = false;
        this.isLoading = false;

        // 清理资源
        this.cleanupAttachmentManager(true);

        // 显示错误信息
        const errorMessage = '附件管理器初始化失败: ' + error.message;
        this.showToast(errorMessage, 'error', 5000);
        
        console.log('[错误处理] 错误处理完成');
    }

    hideAttachmentView() {
        console.log('[隐藏视图] 开始隐藏附件视图');
        
        try {
            // 设置状态
            this.isViewActive = false;
            this.isLoading = false;

            // 按顺序清理
            this.cleanupAttachmentManager();
            this.removeOverlayPanel();
            this.restorePageState();
            
            // 确保按钮仍然存在，如果不存在则重新创建
            setTimeout(() => {
                const existingButton = document.querySelector('#attachment-downloader-btn, [data-attachment-manager-btn="true"], .attachment-floating-btn');
                if (!existingButton) {
                    console.log('[隐藏视图] 按钮丢失，重新创建');
                    this.createAndInjectButton();
                }
            }, 500);
            
            console.log('[隐藏视图] 附件视图隐藏完成');
        } catch (error) {
            console.error('[隐藏视图] 隐藏过程中出现错误:', error);
            this.cleanupAttachmentManager(true);
            try {
                this.showToast('关闭附件视图时出现问题，已强制清理', 'warning', 3000);
            } catch (toastError) {
                console.error('[隐藏视图] 无法显示错误提示:', toastError);
            }
        }
    }



    // 文件夹变化时的重新初始化
    async reinitializeForFolderChange() {
        console.log('[重新初始化] 开始文件夹变化重新初始化');
        
        try {
            // 更新当前文件夹ID
            this.currentFolderId = this.downloader.getCurrentFolderId();
            this.isLoading = true;

            // 清理当前数据
            this.attachments = [];
            this.selectedAttachments.clear();
            this.totalMailCount = 0;

            // 更新工具栏标题
            const titleElement = document.querySelector('#attachment-manager-overlay h1');
            if (titleElement) {
                titleElement.textContent = this.getFolderDisplayName();
            }

            // 重新加载数据
            await this.loadAttachmentData();
            await this.completeInitialization();
            
            console.log('[重新初始化] 文件夹变化重新初始化完成');
        } catch (error) {
            console.error('[重新初始化] 重新初始化失败:', error);
            this.showToast('切换文件夹失败: ' + error.message, 'error');

            // 显示错误状态
            const container = document.querySelector('#attachment-content-area');
            if (container) {
                this.showState('error', '切换文件夹失败: ' + error.message, container);
            }
        } finally {
            this.isLoading = false;
        }
    }

    // 统一清理方法
    cleanupAttachmentManager(force = false) {
        try {
            // 清理选中状态和引用
            this.selectedAttachments.clear();
            this.smartDownloadButton = null;
            this.overlayPanel = null;

            // 清理定时器
            if (this.downloadProgressTimer) {
                clearInterval(this.downloadProgressTimer);
                this.downloadProgressTimer = null;
            }

            // 移除全局键盘事件监听器
            this.removeGlobalKeyListener();

            // 断开按钮重复检查观察器
            if (this.buttonObserver) {
                this.buttonObserver.disconnect();
                this.buttonObserver = null;
            }

            // 移除响应式监听器
            if (this.resizeListener) {
                window.removeEventListener('resize', this.resizeListener);
                this.resizeListener = null;
            }

            // 清理浮动按钮样式
            const floatingBtnStyles = document.getElementById('attachment-floating-btn-styles');
            if (floatingBtnStyles) {
                floatingBtnStyles.remove();
            }

            // 清理DOM元素
            const elementsToRemove = force ? [
                '#attachment-manager-overlay',
                '.attachment-manager-panel',
                '.attachment-toast',
                '.attachment-menu',
                '.attachment-dialog',
                '[data-attachment-manager]'
            ] : [
                '.attachment-toast',
                '.attachment-menu',
                '.attachment-dialog',
                '[data-attachment-manager]'
            ];

            elementsToRemove.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    // 保护按钮不被删除
                    if (element.hasAttribute('data-attachment-manager-btn')) {
                        return;
                    }
                    
                    if (selector === '[data-attachment-manager]') {
                        element.removeAttribute('data-attachment-manager');
                    } else {
                        element.remove();
                    }
                });
            });

            // 清理样式和进度
            const customStyles = document.querySelectorAll('style[data-attachment-manager], #attachment-layout-style');
            customStyles.forEach(style => style.remove());
            this.hideProgress();

            // 重置内部状态
            this.isLoading = false;
            this.isViewActive = false;

            // 恢复页面状态
            if (force) {
                this.restorePageState();
            }

        } catch (error) {
            // 静默忽略清理错误
        }
    }

    createWindowHeader() {
        const header = this.createUI('div', {
            className: 'attachment-window-header'
        });

        // 窗口标题
        const title = this.createUI('div', {
            styles: 'display: flex; align-items: center; gap: 12px;',
            content: `
                <div style="font-size: 16px; font-weight: 600; color: var(--base_gray_100, #13181D);">
                ${this.getFolderDisplayName()}
                </div>
            `
        });

        // 窗口控制按钮
        const controls = this.createUI('div', {
            className: 'attachment-window-controls'
        });

        // 最小化按钮
        const minimizeBtn = this.createUI('div', {
            className: 'attachment-window-button minimize',
            title: '最小化',
            events: {
                click: (e) => {
                    e.stopPropagation();
                    this.toggleMinimize();
                }
            }
        });

        // 最大化按钮
        const maximizeBtn = this.createUI('div', {
            className: 'attachment-window-button maximize',
            title: '最大化/还原',
            events: {
                click: (e) => {
                    e.stopPropagation();
                    this.toggleMaximize();
                }
            }
        });

        // 关闭按钮
        const closeBtn = this.createUI('div', {
            className: 'attachment-window-button close',
            title: '关闭',
            events: {
                click: (e) => {
                    e.stopPropagation();
                    this.hideAttachmentView();
                }
            }
        });

        controls.appendChild(minimizeBtn);
        controls.appendChild(maximizeBtn);
        controls.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(controls);

        return header;
    }

    createOverlayPanel() {
        this.removeOverlayPanel();

        // 添加布局样式
        StyleManager.addLayoutStyles();

        // 创建背景遮罩
        this.overlayBackground = this.createUI('div', {
            className: 'attachment-floating-overlay',
            events: { 
                click: (e) => {
                    if (e.target === this.overlayBackground) {
                        this.hideAttachmentView();
                    }
                }
            }
        });

        // 创建浮动窗口
        this.overlayPanel = this.createUI('div', {
            className: 'attachment-floating-window',
            events: { keydown: (e) => e.key === 'Escape' && (e.preventDefault(), this.hideAttachmentView()) }
        });
        this.overlayPanel.id = AttachmentManager.SELECTORS.OVERLAY_PANEL.slice(1);
        this.overlayPanel.tabIndex = -1;

        // 创建窗口标题栏
        const header = this.createWindowHeader();
        
        // 创建窗口内容
        const content = this.createUI('div', {
            className: 'attachment-window-content',
            content: this.createNativeAttachmentView()
        });

        this.overlayPanel.appendChild(header);
        this.overlayPanel.appendChild(content);
        this.overlayBackground.appendChild(this.overlayPanel);
        document.body.appendChild(this.overlayBackground);

        // 添加拖拽功能
        this.addWindowDragFunctionality(header);

        // 显示动画
        requestAnimationFrame(() => {
            this.overlayBackground.classList.add('show');
            this.overlayPanel.classList.add('show');
            this.overlayPanel.focus();
        });
    }

    addWindowDragFunctionality(header) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('attachment-window-button')) return;
            if (this.overlayPanel.classList.contains('maximized')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.overlayPanel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            header.style.cursor = 'grabbing';
            e.preventDefault();
        });

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;

            // 限制窗口不能拖出屏幕
            const maxLeft = window.innerWidth - this.overlayPanel.offsetWidth;
            const maxTop = window.innerHeight - this.overlayPanel.offsetHeight;
            
            const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
            const constrainedTop = Math.max(0, Math.min(newTop, maxTop));

            this.overlayPanel.style.left = constrainedLeft + 'px';
            this.overlayPanel.style.top = constrainedTop + 'px';
            this.overlayPanel.style.transform = 'none';
        };

        const handleMouseUp = () => {
            isDragging = false;
            header.style.cursor = 'move';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // 双击标题栏最大化/还原
        header.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('attachment-window-button')) return;
            this.toggleMaximize();
        });
    }

    toggleMinimize() {
        this.overlayPanel.classList.toggle('minimized');
        this.isMinimized = this.overlayPanel.classList.contains('minimized');
    }

    toggleMaximize() {
        this.overlayPanel.classList.toggle('maximized');
        this.isMaximized = this.overlayPanel.classList.contains('maximized');
        
        if (this.isMaximized) {
            // 保存当前位置和大小
            this.windowState = {
                left: this.overlayPanel.style.left,
                top: this.overlayPanel.style.top,
                width: this.overlayPanel.style.width,
                height: this.overlayPanel.style.height,
                transform: this.overlayPanel.style.transform
            };
        } else {
            // 恢复之前的位置和大小
            if (this.windowState) {
                this.overlayPanel.style.left = this.windowState.left;
                this.overlayPanel.style.top = this.windowState.top;
                this.overlayPanel.style.width = this.windowState.width;
                this.overlayPanel.style.height = this.windowState.height;
                this.overlayPanel.style.transform = this.windowState.transform;
            } else {
                // 如果没有保存的状态，回到中心位置
                this.overlayPanel.style.left = '';
                this.overlayPanel.style.top = '';
                this.overlayPanel.style.width = '';
                this.overlayPanel.style.height = '';
                this.overlayPanel.style.transform = 'translate(-50%, -50%)';
            }
        }
    }

    removeOverlayPanel() {
        // 移除浮动窗口
        if (this.overlayBackground) {
            // 添加关闭动画
            this.overlayBackground.classList.remove('show');
            if (this.overlayPanel) {
                this.overlayPanel.classList.remove('show');
            }

            // 延迟移除元素，等待动画完成
            setTimeout(() => {
                if (this.overlayBackground && this.overlayBackground.parentNode) {
                    this.overlayBackground.remove();
                }
                this.overlayBackground = null;
                this.overlayPanel = null;
            }, 300);
        }

        // 移除可能遗留的浮动窗口
        const existingOverlays = document.querySelectorAll('.attachment-floating-overlay');
        existingOverlays.forEach(overlay => overlay.remove());

        // 清理引用
        this.smartDownloadButton = null;
        this.windowState = null;
        this.isMinimized = false;
        this.isMaximized = false;

        // 移除可能的高z-index元素
        const highZIndexElements = document.querySelectorAll('[style*="z-index: 10000"], [style*="z-index: 99999"]');
        highZIndexElements.forEach(element => {
            // 保护按钮不被删除
            if (element.hasAttribute('data-attachment-manager-btn') || 
                element.classList.contains('attachment-floating-btn')) {
                return;
            }
            
            if (element.classList.contains('attachment-floating-overlay') ||
                element.classList.contains('attachment-floating-window') ||
                element.classList.contains('attachment-toast') ||
                element.classList.contains('attachment-menu') ||
                element.classList.contains('attachment-dialog')) {
                element.remove();
            }
        });
    }



    restorePageState() {
        try {
            // 恢复页面滚动
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.documentElement.style.position = '';
            document.body.style.position = '';

            // 移除可能的遮罩层
            const overlays = document.querySelectorAll('[style*="position: fixed"][style*="z-index"]');
            overlays.forEach(overlay => {
                if (overlay.id === 'attachment-manager-overlay' ||
                    overlay.classList.contains('attachment-manager-panel') ||
                    overlay.classList.contains('attachment-overlay')) {
                    overlay.remove();
                }
            });

            // 确保原生页面元素可见和可交互
            const mainApp = document.querySelector('#mailMainApp, .mail-main-app, .main-content');
            if (mainApp) {
                mainApp.style.display = '';
                mainApp.style.visibility = '';
                mainApp.style.pointerEvents = '';
            }

            // 恢复工具栏状态
            const toolbar = document.querySelector('.xmail-ui-ellipsis-toolbar');
            if (toolbar) {
                toolbar.style.display = '';
                toolbar.style.visibility = '';
                toolbar.style.pointerEvents = '';
            }

            // 重新启用页面交互
            document.body.style.pointerEvents = '';

            // 触发窗口resize事件，确保页面布局正确
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);

        } catch (error) {
            // 静默忽略页面状态恢复错误
        }
    }

    addGlobalKeyListener() {
        // 移除可能存在的旧监听器
        this.removeGlobalKeyListener();

        // 创建新的键盘事件处理器
        this.globalKeyHandler = (e) => {
            // 只有在面板激活且不在加载状态时才响应ESC键
            if (this.isViewActive && !this.isLoading && e.key === 'Escape') {
                // 检查是否有其他弹窗或输入框处于焦点状态
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' || 
                    activeElement.contentEditable === 'true'
                );
                
                // 检查是否有其他模态框打开
                const hasOtherModals = document.querySelector('.attachment-dialog, .variable-selector-overlay');
                
                if (!isInputFocused && !hasOtherModals) {
                    console.log('[键盘监听] ESC键被按下，关闭附件面板');
                    e.preventDefault();
                    e.stopPropagation();
                    this.hideAttachmentView();
                }
            }
        };

        // 添加全局键盘事件监听器
        document.addEventListener('keydown', this.globalKeyHandler, true);
        console.log('[键盘监听] 全局键盘监听器已添加');
    }

    removeGlobalKeyListener() {
        if (this.globalKeyHandler) {
            document.removeEventListener('keydown', this.globalKeyHandler, true);
            this.globalKeyHandler = null;
        }
    }

    updateSmartDownloadButton() {
        if (!this.smartDownloadButton) return;
        
        const selectedCount = this.selectedAttachments.size;
        const text = selectedCount > 0 ? `下载选中 (${selectedCount})` : '下载全部';
        
        if (this.smartDownloadButton.querySelector('svg')) {
            this.smartDownloadButton.lastChild.textContent = text;
        } else {
            this.smartDownloadButton.textContent = text;
        }
    }



        // 简化的原生附件视图，适配浮动窗口
    createNativeAttachmentView() {
        return `
            <div class="mail-list-page-items" style="border: none; box-shadow: none; height: 100%; overflow: hidden;">
                <div class="mail-list-page-items-inner" style="border: none; border-radius: 0; box-shadow: none; margin: 0; height: 100%; display: flex; flex-direction: column;">
                    <div class="xmail-ui-float-scroll" style="border: none; flex: 1; overflow: hidden;">
                        <div class="ui-float-scroll-body" tabindex="0" style="padding: 0; height: 100%; overflow-y: auto;">
                            <div id="attachment-content-area" style="padding: 20px; min-height: 100%;">
                                <!-- Bento Grid统计信息将在这里显示 -->
                            </div>
                        </div>
                    </div>
                    <div id="attachment-progress-area" style="display: none; border: none; margin: 0; position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid var(--base_gray_010, #e9e9e9); z-index: 1001;"></div>
                </div>
            </div>
        `;
    }



    displayAttachments(attachments) {
        const container = document.querySelector('#attachment-manager-overlay #attachment-content-area') || document.querySelector('#attachment-content-area');
        if (!container) return;

        container.innerHTML = '';
        document.getElementById('attachment-state')?.remove();

        if (!attachments?.length) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: #888;">当前文件夹暂无附件</div>`;
            this.updateMailCount([]);
            return;
        }

            this.displayBentoGrid(attachments, container);
            this.updateMailCount(attachments);
            this.updateSmartDownloadButton();
        }

            displayBentoGrid(attachments, container) {
        const bentoGrid = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoGrid
        });

        // 立即显示的基础统计
        const basicStats = this.calculateBasicStats(attachments);
        
        // 1. 标题栏
        const headerCard = this.createHeaderCard();
        bentoGrid.appendChild(headerCard);
        
        // 2. 主要功能行（下载卡片 + 快速操作）
        const mainFunctionRow = this.createMainFunctionRow();
        bentoGrid.appendChild(mainFunctionRow);
        
        // 添加分隔线
        const divider1 = this.createUI('div', {
            styles: 'height: 1px; background: linear-gradient(90deg, transparent, var(--base_gray_010, rgba(22, 46, 74, 0.1)), transparent); margin: 8px 0;'
        });
        bentoGrid.appendChild(divider1);
        
        // 3. 邮件统计卡片
        const mailStatsCard = this.createMailStatsCard(basicStats.totalMails);
        bentoGrid.appendChild(mailStatsCard);
        
        // 4. 无附件邮件详细列表
        const noAttachmentListCard = this.createNoAttachmentListCard();
        bentoGrid.appendChild(noAttachmentListCard);
        
        // 5. 文件类型和问题文件统计行
        const fileTypeRow = this.createFileTypeRow();
        bentoGrid.appendChild(fileTypeRow);
        
        // 6. 命名异常附件详细列表
        const invalidNamingListCard = this.createInvalidNamingListCard();
        bentoGrid.appendChild(invalidNamingListCard);
        
        // 7. 重复附件详细列表
        const duplicateAttachmentsListCard = this.createDuplicateAttachmentsListCard();
        bentoGrid.appendChild(duplicateAttachmentsListCard);
        
        container.appendChild(bentoGrid);
        
        // 更新文件夹结构预览
        this.updateFolderStructurePreview(attachments);

        // 延迟计算详细统计
        const cards = [
            headerCard,                     // 索引0 - 标题栏
            mainFunctionRow,                // 索引1 - 主要功能行
            mailStatsCard,                  // 索引2 - 邮件统计
            noAttachmentListCard,           // 索引3 - 无附件邮件列表
            fileTypeRow,                    // 索引4 - 文件类型和问题文件
            invalidNamingListCard,          // 索引5 - 命名异常列表
            duplicateAttachmentsListCard    // 索引6 - 重复附件列表
        ];
        this.calculateDetailedStatsAsync(attachments, cards);
    }

            // 基础统计 - 立即计算
    calculateBasicStats(attachments) {
        return {
            totalMails: new Set(attachments.map(a => a.mailId)).size,
            totalMailsInFolder: this.totalMailCount
        };
    }

    // 详细统计 - 异步计算
    async calculateDetailedStatsAsync(attachments, cards) {
        // 初始化详细数据
        this.detailData = {
            noAttachmentMails: [],
            invalidNamingAttachments: [],
            duplicateAttachments: []
        };
        
        // 分批计算，避免阻塞UI
        const batchSize = 50;
        const stats = {
            totalAttachments: attachments.length,
            senderCount: 0,
            noAttachmentMails: 0,
            duplicateMails: 0,
            duplicateAttachments: 0,
            totalSize: 0,
            largeAttachments: 0,
            imageCount: 0,
            archiveCount: 0,
            documentCount: 0,
            otherCount: 0,
            invalidNaming: 0
        };

        // 更新附件数量
        this.updateElementById('attachment-count', this.attachments ? this.attachments.length : attachments.length);

        // 分批处理附件
        for (let i = 0; i < attachments.length; i += batchSize) {
            const batch = attachments.slice(i, i + batchSize);
            await this.processBatch(batch, stats);
            
            // 让出主线程
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        // 计算发件人数量
        const senders = new Set();
        const mailSubjects = new Map();
        const mailStats = await this.getAllMailsForStats();
        const allMails = mailStats.mails;

        for (const mail of allMails) {
            if (mail.senders?.item?.[0]?.email) {
                senders.add(mail.senders.item[0].email);
            }
            
            // 统计重复邮件
            const subject = mail.subject?.trim().toLowerCase();
            if (subject) {
                mailSubjects.set(subject, (mailSubjects.get(subject) ?? 0) + 1);
            }
        }

        stats.senderCount = senders.size;
        stats.totalMailsInFolder = mailStats.totalMails;
        
        // 保存无附件邮件详细数据
        this.detailData.noAttachmentMails = allMails.filter(mail => !mail.attach || mail.attach != 1);
        stats.noAttachmentMails = this.detailData.noAttachmentMails.length;
        stats.duplicateMails = Array.from(mailSubjects.values()).filter(count => count > 1).length;
        
        // 计算重复附件数量（基于文件名和大小）
        const attachmentMap = new Map();
        const attachmentGroups = new Map();
        
        attachments.forEach(attachment => {
            const key = `${attachment.name}_${attachment.size}`;
            attachmentMap.set(key, (attachmentMap.get(key) ?? 0) + 1);
            
            if (!attachmentGroups.has(key)) {
                attachmentGroups.set(key, []);
            }
            attachmentGroups.get(key).push(attachment);
        });
        
        // 收集重复文件详细信息
        this.detailData.duplicateAttachments = [];
        for (const [key, attachments] of attachmentGroups.entries()) {
            if (attachments.length > 1) {
                this.detailData.duplicateAttachments.push(...attachments.map(attachment => ({
                    ...attachment,
                    duplicateKey: key,
                    duplicateCount: attachments.length
                })));
            }
        }
        
        stats.duplicateAttachments = Array.from(attachmentMap.values()).filter(count => count > 1).length;

        // 更新主下载卡片
        this.updateElementById('attachment-count', this.attachments ? this.attachments.length : attachments.length);
        this.updateElementById('total-size', `总大小 ${this.formatFileSize(stats.totalSize)}`);
        
        // 更新统计概览卡片
        this.updateElementById('quick-mail-count', stats.totalMailsInFolder || this.totalMailCount || '计算中...');
        this.updateElementById('quick-sender-count', stats.senderCount || '计算中...');
        this.updateElementById('quick-no-attachment-mails', stats.noAttachmentMails || '计算中...');
        
        // 更新警告卡片
        this.updateElementById('no-attachment-mails', stats.noAttachmentMails);
        
        // 更新邮件统计卡片
        this.updateElementById('sender-count', stats.senderCount);
        
        // 更新文件类型统计
        this.updateElementById('image-files', stats.imageCount);
        this.updateElementById('archive-files', stats.archiveCount);
        this.updateElementById('document-files', stats.documentCount);
        this.updateElementById('other-files', stats.otherCount);
        
        // 更新问题文件统计
        this.updateElementById('invalid-naming', stats.invalidNaming);
        this.updateElementById('large-files', stats.largeAttachments);
        this.updateElementById('duplicate-attachments', stats.duplicateAttachments);
        this.updateElementById('duplicate-mails', stats.duplicateMails);
        
        // 更新详细列表
        this.updateNoAttachmentList();
        this.updateInvalidNamingList();
        this.updateDuplicateAttachmentsList();
    }

    async processBatch(batch, stats) {
        const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
        const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];

        // 确保详细数据数组存在
        if (!this.detailData.invalidNamingAttachments) {
            this.detailData.invalidNamingAttachments = [];
        }

        batch.forEach(attachment => {
            // 计算文件大小
            const size = parseInt(attachment.size) || parseInt(attachment.filesize);
            stats.totalSize += size;

            // 超大附件 (>10MB)
            if (size > 10 * 1024 * 1024) {
                stats.largeAttachments++;
            }

            // 文件类型统计
            const ext = attachment.ext || this.processFileName(attachment.name, 'getExtension');
            const extLower = ext?.toLowerCase() || '';
            
            if (imageExts.includes(extLower)) {
                stats.imageCount++;
            } else if (archiveExts.includes(extLower)) {
                stats.archiveCount++;
            } else if (documentExts.includes(extLower)) {
                stats.documentCount++;
            } else {
                stats.otherCount++;
            }

            // 命名异常检查 - 使用设置中的验证规则
            const fileName = attachment.name;
            const validationResult = this.checkFileNameValidation(fileName);
            
            if (!validationResult.isValid) {
                stats.invalidNaming++;
                this.detailData.invalidNamingAttachments.push({
                    ...attachment,
                    invalidReason: validationResult.reason
                });
            }
        });
    }

    // 检查文件名是否符合验证规则
    checkFileNameValidation(fileName) {
        const validation = this.downloadSettings.fileNaming.validation;
        
        // 如果验证未开启，则认为所有文件名都是有效的
        if (!validation?.enabled) {
            return { isValid: true, reason: '' };
        }

        // 如果没有设置验证模式，使用默认的基本检查
        if (!validation.pattern) {
            // 基本的文件名检查
            if (!fileName || fileName.trim() === '') {
                return { isValid: false, reason: '文件名为空' };
            }
            if (!fileName.includes('.')) {
                return { isValid: false, reason: '没有文件扩展名' };
            }
            return { isValid: true, reason: '' };
        }

        try {
            const regex = new RegExp(validation.pattern);
            const nameWithoutExt = this.processFileName(fileName, 'removeExtension');
            
            if (!regex.test(nameWithoutExt)) {
                return { 
                    isValid: false, 
                    reason: `不符合验证规则: ${validation.pattern}` 
                };
            }
            
            return { isValid: true, reason: '' };
        } catch (error) {
            console.warn('正则表达式验证失败:', error);
            // 如果正则表达式有问题，使用基本检查
            if (!fileName.includes('.')) {
                return { isValid: false, reason: '没有文件扩展名' };
            }
            return { isValid: true, reason: '' };
        }
    }

    async getAllMailsForStats() {
        try {
            const folderId = this.downloader.getCurrentFolderId();
            // 获取更多邮件数据以提高统计准确性，最多获取前5页（250封邮件）
            const allMails = await this.downloader.getMailsWithPagination(folderId, 5);
            // 同时获取总数信息
            const firstPageResult = await this.downloader.fetchMailList(folderId, 0, 50);
            return {
                mails: allMails,
                totalMails: firstPageResult.total,
                unreadMails: firstPageResult.unread
            };
        } catch (error) {
            console.warn('获取邮件统计失败:', error);
            return { mails: [], totalMails: 0, unreadMails: 0 };
        }
    }

    // 更新无附件邮件列表
    updateNoAttachmentList() {
        const container = document.getElementById('no-attachment-list-container');
        const listCard = container?.closest('.bento-card');
        
        if (!container) return;
        
        const data = this.detailData.noAttachmentMails;
        
        if (data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                    暂无无附件邮件
                </div>
            `;
            if (listCard) listCard.style.display = 'none';
            return;
        }
        
        // 显示列表卡片
        if (listCard) listCard.style.display = 'block';
        
        // 只显示前5条，超过5条显示"查看更多"
        const displayData = data.slice(0, 5);
        const hasMore = data.length > 5;
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建主容器
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        
        // 添加邮件项目
        displayData.forEach((mail, index) => {
            const mailElement = this.renderCompactMailItem(mail, index);
            mainContainer.appendChild(mailElement);
        });
        
        // 添加"更多"提示
        if (hasMore) {
            const moreDiv = document.createElement('div');
            moreDiv.style.cssText = 'padding: 12px; text-align: center; border-top: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); margin-top: 8px;';
            moreDiv.innerHTML = `
                <span style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                    还有 ${data.length - 5} 封邮件未显示
                </span>
            `;
            mainContainer.appendChild(moreDiv);
        }
        
        container.appendChild(mainContainer);
    }

    // 更新命名异常附件列表
    updateInvalidNamingList() {
        const container = document.getElementById('invalid-naming-list-container');
        const listCard = container?.closest('.bento-card');
        
        if (!container) return;
        
        const data = this.detailData.invalidNamingAttachments;
        const validation = this.downloadSettings.fileNaming.validation;
        
        // 检查验证规则状态
        const validationStatus = this.getValidationStatus();
        
        if (data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                    <div style="margin-bottom: 8px;">暂无命名异常附件</div>
                    <div style="font-size: 11px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5));">
                        ${validationStatus}
                    </div>
                </div>
            `;
            if (listCard) listCard.style.display = 'none';
            return;
        }
        
        // 显示列表卡片
        if (listCard) listCard.style.display = 'block';
        
        // 只显示前5条，超过5条显示"查看更多"
        const displayData = data.slice(0, 5);
        const hasMore = data.length > 5;
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建验证规则提示
        const validationInfo = document.createElement('div');
        validationInfo.style.cssText = 'margin-bottom: 12px; padding: 8px; background: var(--base_gray_005, rgba(22, 46, 74, 0.05)); border-radius: 6px; border-left: 3px solid var(--theme_primary, #007bff);';
        validationInfo.innerHTML = `
            <div style="font-size: 12px; color: var(--base_gray_070, rgba(22, 30, 38, 0.7)); margin-bottom: 2px;">当前验证规则</div>
            <div style="font-size: 11px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">${validationStatus}</div>
        `;
        
        // 创建主容器
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        
        // 添加附件项目
        displayData.forEach((attachment, index) => {
            const attachmentElement = this.renderCompactAttachmentItem(attachment, index);
            mainContainer.appendChild(attachmentElement);
        });
        
        // 添加"更多"提示
        if (hasMore) {
            const moreDiv = document.createElement('div');
            moreDiv.style.cssText = 'padding: 12px; text-align: center; border-top: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); margin-top: 8px;';
            moreDiv.innerHTML = `
                <span style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                    还有 ${data.length - 5} 个异常附件未显示
                </span>
            `;
            mainContainer.appendChild(moreDiv);
        }
        
        container.appendChild(validationInfo);
        container.appendChild(mainContainer);
        
        // 验证设置按钮事件处理已在卡片创建时添加
    }

    // 获取验证规则状态描述
    getValidationStatus() {
        const validation = this.downloadSettings.fileNaming.validation;
        
        if (!validation?.enabled) {
            return '验证规则已关闭 - 仅检查基本文件名格式';
        }
        
        if (!validation.pattern) {
            return '验证规则已开启 - 使用默认基本检查';
        }
        
        return `验证规则: ${validation.pattern}`;
    }

    // 更新重复附件列表
    updateDuplicateAttachmentsList() {
        const container = document.getElementById('duplicate-attachments-list-container');
        const listCard = container?.closest('.bento-card');
        
        if (!container) return;
        
        const data = this.detailData.duplicateAttachments;
        
        if (data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                    暂无重复附件
                </div>
            `;
            if (listCard) listCard.style.display = 'none';
            return;
        }
        
        // 显示列表卡片
        if (listCard) listCard.style.display = 'block';
        
        // 按重复组分组显示
        const groupedData = this.groupDuplicateAttachments(data);
        const displayGroups = groupedData.slice(0, 3); // 只显示前3组
        const hasMore = groupedData.length > 3;
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建主容器
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
        
        // 添加组元素
        displayGroups.forEach((group, index) => {
            const groupElement = this.renderDuplicateGroup(group, index);
            mainContainer.appendChild(groupElement);
        });
        
        // 添加"更多"提示
        if (hasMore) {
            const moreDiv = document.createElement('div');
            moreDiv.style.cssText = 'padding: 12px; text-align: center; border-top: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); margin-top: 8px;';
            moreDiv.innerHTML = `
                <span style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                    还有 ${groupedData.length - 3} 组重复文件未显示
                </span>
            `;
            mainContainer.appendChild(moreDiv);
        }
        
        container.appendChild(mainContainer);
    }

    // 将重复附件按组分组
    groupDuplicateAttachments(duplicateAttachments) {
        const groups = new Map();
        
        duplicateAttachments.forEach(attachment => {
            const key = attachment.duplicateKey;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(attachment);
        });
        
        return Array.from(groups.values());
    }

    // 渲染重复文件组
    renderDuplicateGroup(group, groupIndex) {
        if (group.length === 0) return document.createElement('div');
        
        const fileName = group[0].name;
        const fileSize = this.formatFileSize(parseInt(group[0].size) || parseInt(group[0].filesize));
        const duplicateCount = group.length;
        
        // 找出最新的附件（按时间排序）
        const sortedGroup = [...group].sort((a, b) => {
            const dateA = this.processData(a.date || a.totime, 'createSafeDate');
            const dateB = this.processData(b.date || b.totime, 'createSafeDate');
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB.getTime() - dateA.getTime();
        });
        
        // 标记最新的附件
        const latestAttachment = sortedGroup[0];
        const groupWithLatestFlag = group.map(attachment => ({
            ...attachment,
            isLatest: attachment === latestAttachment
        }));
        
        const groupDiv = document.createElement('div');
        groupDiv.style.cssText = 'padding: 12px; background: var(--base_gray_005, rgba(22, 46, 74, 0.05)); border-radius: 6px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1));';
        
        // 创建头部信息
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;';
        headerDiv.innerHTML = `
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 500; color: var(--base_gray_090, rgba(22, 30, 38, 0.9)); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px;">${fileName}</div>
                <div style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); display: flex; align-items: center; gap: 8px;">
                    <span style="background: var(--theme_warning_light, rgba(255, 193, 7, 0.1)); color: var(--theme_warning, #ffc107); padding: 1px 4px; border-radius: 3px; font-size: 11px;">重复 ${duplicateCount} 次</span>
                    <span>${fileSize}</span>
                </div>
            </div>
        `;
        
        // 创建附件列表容器
        const itemsContainer = document.createElement('div');
        itemsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto;';
        
        // 添加附件项目
        groupWithLatestFlag.forEach((attachment, index) => {
            const itemElement = this.renderCompactDuplicateAttachmentItem(attachment, index);
            itemsContainer.appendChild(itemElement);
        });
        
        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(itemsContainer);
        
        return groupDiv;
    }

    // 渲染紧凑的重复附件项目
    renderCompactDuplicateAttachmentItem(attachment, index) {
        const mailSubject = attachment.mailSubject;
        const mailId = attachment.mailId;
        const attachmentDate = this.processData(attachment.date || attachment.totime, 'createSafeDate');
        const dateStr = attachmentDate ? this.formatDate(attachmentDate, 'MM-DD HH:mm') : '未知时间';
        const isLatest = attachment.isLatest;
        const senderName = attachment.senderName || '未知发件人';
        const senderEmail = attachment.senderEmail || attachment.sender || '';
        
        const div = document.createElement('div');
        div.style.cssText = `padding: 8px; background: white; border-radius: 4px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); cursor: pointer; transition: all 0.2s;`;
        div.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; color: var(--base_gray_070, rgba(22, 30, 38, 0.7)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                        <span>来自邮件: ${mailSubject}</span>
                        ${isLatest ? '<span style="background: var(--theme_success, #28a745); color: white; padding: 1px 4px; border-radius: 3px; font-size: 10px; font-weight: 500;">最新</span>' : ''}
                    </div>
                    <div style="font-size: 10px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); margin-bottom: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        发件人: ${senderName}${senderEmail ? ` (${senderEmail})` : ''}
                    </div>
                    <div style="font-size: 10px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        时间: ${dateStr}
                    </div>
                </div>
                <div style="color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); font-size: 10px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        div.addEventListener('click', () => this.openMail(mailId));
        div.addEventListener('mouseenter', (e) => e.target.style.background = 'var(--base_gray_005, rgba(22, 46, 74, 0.05))');
        div.addEventListener('mouseleave', (e) => e.target.style.background = 'white');
        
        return div;
    }

    // 渲染紧凑的邮件项目
    renderCompactMailItem(mail, index) {
        const subject = mail.subject;
        const senderData = mail.senders?.item?.[0];
        const senderName = senderData?.name || senderData?.nick || '未知发件人';
        const senderEmail = senderData?.email || '';
        // 修复时间字段：使用totime而不是date
        const timestamp = mail.totime || mail.date;
        const date = timestamp ? this.formatDate(this.processData(timestamp, 'createSafeDate'), 'MM-DD HH:mm') : '未知时间';
        // 修复邮件ID字段：使用emailid而不是id
        const mailId = mail.emailid || mail.id;
        
        const div = document.createElement('div');
        div.style.cssText = `padding: 12px; background: var(--base_gray_005, rgba(22, 46, 74, 0.05)); border-radius: 6px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); cursor: pointer; transition: all 0.2s;`;
        div.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; color: var(--base_gray_090, rgba(22, 30, 38, 0.9)); margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px;">${subject}</div>
                    <div style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">发件人: ${senderName}${senderEmail ? ` (${senderEmail})` : ''}</div>
                    <div style="font-size: 11px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">时间: ${date}</div>
                </div>
                <div style="color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); font-size: 12px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        div.addEventListener('click', () => this.openMail(mailId));
        div.addEventListener('mouseenter', (e) => e.target.style.background = 'var(--base_gray_010, rgba(22, 46, 74, 0.1))');
        div.addEventListener('mouseleave', (e) => e.target.style.background = 'var(--base_gray_005, rgba(22, 46, 74, 0.05))');
        
        return div;
    }

    // 渲染紧凑的附件项目
    renderCompactAttachmentItem(attachment, index) {
        const fileName = attachment.name;
        const fileSize = this.formatFileSize(parseInt(attachment.size) || parseInt(attachment.filesize));
        const invalidReason = attachment.invalidReason;
        const mailSubject = attachment.mailSubject;
        const mailId = attachment.mailId;
        const senderName = attachment.senderName || '未知发件人';
        const senderEmail = attachment.senderEmail || attachment.sender || '';
        const attachmentDate = this.processData(attachment.date || attachment.totime, 'createSafeDate');
        const dateStr = attachmentDate ? this.formatDate(attachmentDate, 'MM-DD HH:mm') : '未知时间';
        
        // 获取文件图标和缩略图
        const fileIcon = this.getFileIcon(fileName);
        const thumbnailUrl = this.getThumbnailUrl(attachment);
        const supportsThumbnail = this.supportsThumbnail(fileName);
        
        const div = document.createElement('div');
        div.style.cssText = `padding: 12px; background: var(--base_gray_005, rgba(22, 46, 74, 0.05)); border-radius: 6px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); cursor: pointer; transition: all 0.2s;`;
        div.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <!-- 文件图标/缩略图 -->
                <div class="file-preview-container" style="width: 36px; height: 36px; border-radius: 6px; background: var(--base_gray_010, rgba(22, 46, 74, 0.1)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; position: relative;">
                    ${supportsThumbnail && thumbnailUrl ? 
                        `<img class="file-thumbnail" src="${thumbnailUrl}" alt="${fileName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 5px; opacity: 0; transition: opacity 0.3s;" data-fallback-icon="${fileIcon}">
                         <span class="file-icon-fallback" style="font-size: 14px; display: none; position: absolute; width: 100%; height: 100%; align-items: center; justify-content: center;">${fileIcon}</span>` : 
                        `<span style="font-size: 14px;">${fileIcon}</span>`
                    }
                </div>
                
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; color: var(--base_gray_090, rgba(22, 30, 38, 0.9)); margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                        <span>${fileName}</span>
                        ${invalidReason ? `<span style="background: var(--theme_danger_light, rgba(220, 53, 69, 0.1)); color: var(--theme_danger, #dc3545); padding: 1px 4px; border-radius: 3px; font-size: 10px;">${invalidReason}</span>` : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">大小: ${fileSize} · 时间: ${dateStr}</div>
                    <div style="font-size: 11px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); margin-bottom: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">来自邮件: ${mailSubject}</div>
                    <div style="font-size: 11px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">发件人: ${senderName}${senderEmail ? ` (${senderEmail})` : ''}</div>
                </div>
                <div style="color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); font-size: 12px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        div.addEventListener('click', () => this.openMail(mailId));
        div.addEventListener('mouseenter', (e) => e.target.style.background = 'var(--base_gray_010, rgba(22, 46, 74, 0.1))');
        div.addEventListener('mouseleave', (e) => e.target.style.background = 'var(--base_gray_005, rgba(22, 46, 74, 0.05))');
        
        // 为缩略图添加事件监听器
        const thumbnailImg = div.querySelector('.file-thumbnail');
        const fallbackIcon = div.querySelector('.file-icon-fallback');
        
        if (thumbnailImg && fallbackIcon) {
            // 图片加载成功
            thumbnailImg.addEventListener('load', () => {
                thumbnailImg.style.opacity = '1';
            });
            
            // 图片加载失败，显示fallback图标
            thumbnailImg.addEventListener('error', () => {
                thumbnailImg.style.display = 'none';
                fallbackIcon.style.display = 'flex';
            });
        }
        
        return div;
    }

    // 显示详细列表
    showDetailList(type) {
        let title = '';
        let data = [];
        let itemRenderer = null;
        
        switch (type) {
            case 'no-attachment':
            case 'no-attachment-mails':
                title = '无附件邮件完整列表';
                data = this.detailData?.noAttachmentMails || [];
                itemRenderer = this.renderMailItem.bind(this);
                break;
            case 'invalid-naming':
                title = '命名异常附件完整列表';
                data = this.detailData?.invalidNamingAttachments || [];
                itemRenderer = this.renderAttachmentItem.bind(this);
                break;
            case 'duplicate-attachments':
                title = '重复附件完整列表';
                // 将重复附件按组分组显示
                const duplicateAttachments = this.detailData?.duplicateAttachments || [];
                data = this.groupDuplicateAttachments(duplicateAttachments);
                itemRenderer = this.renderDuplicateGroupItem.bind(this);
                break;
            default:
                console.warn('未知的列表类型:', type);
                return;
        }
        
        if (data.length === 0) {
            this.showToast(`暂无${title.replace('完整列表', '')}数据`, 'info');
            return;
        }
        
        this.createDetailListDialog(title, data, itemRenderer);
    }

    // 为重复附件添加最新标记
    addLatestFlagToDuplicateAttachments(duplicateAttachments) {
        if (!duplicateAttachments || duplicateAttachments.length === 0) {
            return [];
        }

        // 按重复组分组
        const groups = new Map();
        duplicateAttachments.forEach(attachment => {
            const key = attachment.duplicateKey;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(attachment);
        });

        const result = [];
        // 为每个组标记最新的附件
        for (const [key, group] of groups.entries()) {
            // 按时间排序找出最新的
            const sortedGroup = [...group].sort((a, b) => {
                const dateA = this.processData(a.date || a.totime, 'createSafeDate');
                const dateB = this.processData(b.date || b.totime, 'createSafeDate');
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateB.getTime() - dateA.getTime();
            });

            const latestAttachment = sortedGroup[0];
            // 为每个附件添加isLatest标记
            const groupWithLatestFlag = group.map(attachment => ({
                ...attachment,
                isLatest: attachment === latestAttachment
            }));

            result.push(...groupWithLatestFlag);
        }

        return result;
    }
    
    // 创建详细列表对话框
    createDetailListDialog(title, data, itemRenderer) {
        const dialog = this.createUI('div', {
            styles: 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);',
            content: `
                <div style="background: white; border-radius: 12px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); width: 95%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
                    <!-- 头部区域 -->
                    <div style="padding: 24px; border-bottom: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); display: flex; align-items: center; justify-content: space-between;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: var(--base_gray_090, rgba(22, 30, 38, 0.9));">${title}</h3>
                            <p id="list-stats" style="margin: 4px 0 0 0; font-size: 14px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                                ${title.includes('重复附件') ? 
                                    `共 <span id="total-count">${data.length}</span> 组重复文件 · 显示 <span id="showing-count">${Math.min(data.length, 20)}</span> 组` :
                                    `共 <span id="total-count">${data.length}</span> 项 · 显示 <span id="showing-count">${Math.min(data.length, 20)}</span> 项`
                                }
                            </p>
                        </div>
                        <button id="close-detail-dialog" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); padding: 8px; border-radius: 6px; transition: all 0.2s; margin-left: 16px;">×</button>
                    </div>
                    
                    <!-- 工具栏区域 -->
                    <div style="padding: 16px 24px; border-bottom: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); background: var(--base_gray_005, rgba(22, 46, 74, 0.05));">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <!-- 搜索框 -->
                            <div style="flex: 1; min-width: 200px; position: relative;">
                                <input id="detail-search" type="text" placeholder="搜索..." style="width: 70%; padding: 8px 12px 8px 36px; border: 1px solid var(--base_gray_020, rgba(22, 46, 74, 0.2)); border-radius: 6px; font-size: 14px; outline: none; transition: all 0.2s;">
                                <svg style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5));" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                            </div>
                            
                            <!-- 排序选择 -->
                            <select id="detail-sort" style="padding: 8px 12px; border: 1px solid var(--base_gray_020, rgba(22, 46, 74, 0.2)); border-radius: 6px; font-size: 14px; background: white; cursor: pointer;">
                                <option value="default">默认排序</option>
                                <option value="name">按名称排序</option>
                                <option value="time">按时间排序</option>
                                <option value="size">按大小排序</option>
                            </select>
                            
                            <!-- 显示数量选择 -->
                            <select id="detail-page-size" style="padding: 8px 12px; border: 1px solid var(--base_gray_020, rgba(22, 46, 74, 0.2)); border-radius: 6px; font-size: 14px; background: white; cursor: pointer;">
                                <option value="20">显示 20 项</option>
                                <option value="50">显示 50 项</option>
                                <option value="100">显示 100 项</option>
                                <option value="all">显示全部</option>
                            </select>
                            
                            <!-- 刷新按钮 -->
                            <button id="detail-refresh" style="padding: 8px 12px; background: var(--theme_primary, #0F7AF5); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                刷新
                            </button>
                        </div>
                    </div>
                    
                    <!-- 列表内容区域 -->
                    <div style="flex: 1; overflow-y: auto; padding: 16px 24px;">
                        <div id="detail-list-container" style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- 内容将通过JavaScript动态加载 -->
                        </div>
                        
                        <!-- 加载更多按钮 -->
                        <div id="load-more-section" style="padding: 16px; text-align: center; margin-top: 16px; display: none;">
                            <button id="load-more-items" style="background: var(--theme_primary, #0F7AF5); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">
                                加载更多
                                    </button>
                                </div>
                        
                        <!-- 空状态提示 -->
                        <div id="empty-state" style="text-align: center; padding: 40px 20px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); display: none;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; color: var(--base_gray_040, rgba(22, 30, 38, 0.4));">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <div style="font-size: 16px; margin-bottom: 8px;">未找到匹配项</div>
                            <div style="font-size: 14px;">尝试调整搜索条件或清除筛选</div>
                        </div>
                    </div>
                </div>
            `
        });
        
        document.body.appendChild(dialog);
        
        // 初始化对话框功能
        this.initializeDetailDialog(dialog, title, data, itemRenderer);
        
        // 设置焦点以便键盘事件生效
        dialog.tabIndex = -1;
        dialog.focus();
    }
    
    // 初始化详细列表对话框功能
    initializeDetailDialog(dialog, title, originalData, itemRenderer) {
        // 存储对话框状态
        const state = {
            originalData: originalData,
            filteredData: [...originalData],
            displayedData: [],
            itemRenderer: itemRenderer,
            currentPage: 0,
            pageSize: 20,
            searchKeyword: '',
            sortBy: 'default'
        };
        
        // 获取DOM元素
        const elements = {
            container: dialog.querySelector('#detail-list-container'),
            searchInput: dialog.querySelector('#detail-search'),
            sortSelect: dialog.querySelector('#detail-sort'),
            pageSizeSelect: dialog.querySelector('#detail-page-size'),
            refreshBtn: dialog.querySelector('#detail-refresh'),
            loadMoreBtn: dialog.querySelector('#load-more-items'),
            loadMoreSection: dialog.querySelector('#load-more-section'),
            emptyState: dialog.querySelector('#empty-state'),
            totalCount: dialog.querySelector('#total-count'),
            showingCount: dialog.querySelector('#showing-count'),
            closeBtn: dialog.querySelector('#close-detail-dialog')
        };
        
        // 更新显示统计
        const updateStats = () => {
            elements.totalCount.textContent = state.filteredData.length;
            elements.showingCount.textContent = state.displayedData.length;
        };
        
        // 渲染列表项
        const renderItems = (items, append = false) => {
            if (!append) {
                elements.container.innerHTML = '';
                state.displayedData = [];
            }
            
            const startIndex = state.displayedData.length;
            const itemsToRender = items.slice(startIndex, startIndex + (state.pageSize === 'all' ? items.length : parseInt(state.pageSize)));
            
            if (itemsToRender.length === 0) {
                if (state.displayedData.length === 0) {
                    elements.emptyState.style.display = 'block';
                }
                elements.loadMoreSection.style.display = 'none';
                return;
            }
            
            elements.emptyState.style.display = 'none';
            
            itemsToRender.forEach((item, index) => {
                const itemHtml = state.itemRenderer(item, startIndex + index);
                elements.container.insertAdjacentHTML('beforeend', itemHtml);
                
                // 获取刚刚插入的最后一个元素
                const lastElement = elements.container.lastElementChild;
                
                // 如果是重复附件组，需要添加事件监听器
                if (Array.isArray(item)) {
                    const duplicateItems = lastElement.querySelectorAll('.duplicate-item');
                    
                    duplicateItems.forEach(duplicateItem => {
                        const mailId = duplicateItem.getAttribute('data-mail-id');
                        
                        // 点击事件  
                        duplicateItem.addEventListener('click', ((mailId) => {
                            return (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this.openMail(mailId);
                            };
                        })(mailId));
                        
                        // 悬停效果
                        duplicateItem.addEventListener('mouseenter', () => {
                            duplicateItem.style.background = 'var(--base_gray_010, rgba(22, 46, 74, 0.1))';
                        });
                        
                        duplicateItem.addEventListener('mouseleave', () => {
                            duplicateItem.style.background = 'var(--base_gray_005, rgba(22, 46, 74, 0.05))';
                        });
                    });
                } else {
                    // 为单个附件项目添加缩略图事件监听器
                    const thumbnailImg = lastElement.querySelector('.file-thumbnail');
                    const fallbackIcon = lastElement.querySelector('.file-icon-fallback');
                    
                    if (thumbnailImg && fallbackIcon) {
                        // 图片加载成功
                        thumbnailImg.addEventListener('load', () => {
                            thumbnailImg.style.opacity = '1';
                        });
                        
                        // 图片加载失败，显示fallback图标
                        thumbnailImg.addEventListener('error', () => {
                            thumbnailImg.style.display = 'none';
                            fallbackIcon.style.display = 'flex';
                        });
                    }
                }
                
                // 为所有项目的缩略图添加事件监听器（包括重复附件组的主图标）
                const groupThumbnailImg = lastElement.querySelector('.file-preview-container .file-thumbnail');
                const groupFallbackIcon = lastElement.querySelector('.file-preview-container .file-icon-fallback');
                
                if (groupThumbnailImg && groupFallbackIcon) {
                    // 图片加载成功
                    groupThumbnailImg.addEventListener('load', () => {
                        groupThumbnailImg.style.opacity = '1';
                    });
                    
                    // 图片加载失败，显示fallback图标
                    groupThumbnailImg.addEventListener('error', () => {
                        groupThumbnailImg.style.display = 'none';
                        groupFallbackIcon.style.display = 'flex';
                    });
                }
            });
            
            state.displayedData.push(...itemsToRender);
            
            // 显示/隐藏加载更多按钮
            const hasMore = state.displayedData.length < state.filteredData.length && state.pageSize !== 'all';
            elements.loadMoreSection.style.display = hasMore ? 'block' : 'none';
            
            updateStats();
        };
        
        // 应用搜索过滤
        const applySearch = () => {
            const keyword = state.searchKeyword.toLowerCase();
            if (!keyword) {
                state.filteredData = [...state.originalData];
            } else {
                state.filteredData = state.originalData.filter(item => {
                    // 判断是重复附件组还是单个项目
                    if (Array.isArray(item)) {
                        // 重复附件组：搜索组内所有附件的信息
                        return item.some(attachment => {
                            const searchText = [
                                attachment.name,
                                attachment.mailSubject,
                                attachment.senderName,
                                attachment.senderEmail,
                                attachment.sender
                            ].filter(Boolean).join(' ').toLowerCase();
                            return searchText.includes(keyword);
                        });
                    } else {
                        // 单个项目：搜索邮件主题、发件人、附件名等
                        const searchText = [
                            item.subject,
                            item.name,
                            item.mailSubject,
                            item.senderName,
                            item.senderEmail,
                            item.sender,
                            item.invalidReason
                        ].filter(Boolean).join(' ').toLowerCase();
                        return searchText.includes(keyword);
                    }
                });
            }
        };
        
        // 应用排序
        const applySort = () => {
            switch (state.sortBy) {
                case 'name':
                    state.filteredData.sort((a, b) => {
                        // 处理重复附件组和单个项目
                        const nameA = Array.isArray(a) ? (a[0]?.name || '') : (a.name || a.subject || '');
                        const nameB = Array.isArray(b) ? (b[0]?.name || '') : (b.name || b.subject || '');
                        return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
                    });
                    break;
                case 'time':
                    state.filteredData.sort((a, b) => {
                        // 处理重复附件组和单个项目
                        let timeA, timeB;
                        if (Array.isArray(a)) {
                            // 重复附件组：取最新时间
                            timeA = Math.max(...a.map(item => item.totime || item.date || 0));
                        } else {
                            timeA = a.totime || a.date || 0;
                        }
                        if (Array.isArray(b)) {
                            // 重复附件组：取最新时间
                            timeB = Math.max(...b.map(item => item.totime || item.date || 0));
                        } else {
                            timeB = b.totime || b.date || 0;
                        }
                        return timeB - timeA; // 新的在前
                    });
                    break;
                case 'size':
                    state.filteredData.sort((a, b) => {
                        // 处理重复附件组和单个项目
                        const sizeA = Array.isArray(a) ? parseInt(a[0]?.size || a[0]?.filesize || 0) : parseInt(a.size || a.filesize || 0);
                        const sizeB = Array.isArray(b) ? parseInt(b[0]?.size || b[0]?.filesize || 0) : parseInt(b.size || b.filesize || 0);
                        return sizeB - sizeA; // 大的在前
                    });
                    break;
                default:
                    // 保持原始顺序
                    break;
            }
        };
        
        // 刷新列表
        const refreshList = () => {
            applySearch();
            applySort();
            state.currentPage = 0;
            renderItems(state.filteredData, false);
        };
        
        // 事件监听器
        elements.searchInput.addEventListener('input', (e) => {
            state.searchKeyword = e.target.value;
            refreshList();
        });
        
        elements.sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            refreshList();
        });
        
        elements.pageSizeSelect.addEventListener('change', (e) => {
            state.pageSize = e.target.value;
            refreshList();
        });
        
        elements.refreshBtn.addEventListener('click', () => {
            // 重新获取数据（如果需要的话）
            refreshList();
            this.showToast('列表已刷新', 'success', 1500);
        });
        
        elements.loadMoreBtn.addEventListener('click', () => {
            renderItems(state.filteredData, true);
        });
        
        elements.closeBtn.addEventListener('click', () => {
                         document.body.removeChild(dialog);
        });
        
        // 点击背景关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
        
        // ESC键关闭
        dialog.addEventListener('keydown', (e) => {
                     if (e.key === 'Escape') {
                         document.body.removeChild(dialog);
            }
        });
        
        // 搜索框焦点样式
        elements.searchInput.addEventListener('focus', () => {
            elements.searchInput.style.borderColor = 'var(--theme_primary, #0F7AF5)';
            elements.searchInput.style.boxShadow = '0 0 0 2px rgba(15, 122, 245, 0.2)';
        });
        
        elements.searchInput.addEventListener('blur', () => {
            elements.searchInput.style.borderColor = 'var(--base_gray_020, rgba(22, 46, 74, 0.2))';
            elements.searchInput.style.boxShadow = 'none';
        });
        
        // 初始化列表
        refreshList();
    }
    
    // 加载更多项目（保留向后兼容）
    loadMoreItems(data, itemRenderer) {
        const container = document.getElementById('detail-list-container');
        if (!container) return;
        
        // 清空容器，显示所有项目
        container.innerHTML = data.map((item, index) => itemRenderer(item, index)).join('');
    }
    
    // 渲染邮件项目
    renderMailItem(mail, index) {
        const subject = mail.subject;
        const senderData = mail.senders?.item?.[0];
        const senderName = senderData?.name || senderData?.nick || '未知发件人';
        const senderEmail = senderData?.email || '';
        const timestamp = mail.totime || mail.date;
        const date = timestamp ? this.formatDate(this.processData(timestamp, 'createSafeDate'), 'MM-DD HH:mm') : '未知时间';
        const mailId = mail.emailid || mail.id;
        
        const element = this.createUI('div', {
            styles: `padding: 12px; background: white; border-radius: 8px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); cursor: pointer; transition: all 0.2s; margin-bottom: 8px;`,
            content: `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                            <div style="font-weight: 600; color: var(--base_gray_090, rgba(22, 30, 38, 0.9)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; flex: 1; margin-right: 12px;">
                                ${subject}
                        </div>
                            <div style="font-size: 12px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); white-space: nowrap;">
                                ${date}
                        </div>
                    </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="font-size: 13px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                                ${senderName}
                            </div>
                        </div>
                    </div>
                    <div style="color: var(--base_gray_040, rgba(22, 30, 38, 0.4)); margin-left: 12px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                    </div>
                </div>
            `,
            events: {
                click: () => this.openMail(mailId),
                mouseenter: (e) => e.target.style.background = 'var(--base_gray_005, rgba(22, 46, 74, 0.05))',
                mouseleave: (e) => e.target.style.background = 'white'
            }
        });
        
        return element.outerHTML;
    }
    
    // 渲染附件项目
    renderAttachmentItem(attachment, index) {
        const fileName = attachment.name;
        const fileSize = this.formatFileSize(parseInt(attachment.size) || parseInt(attachment.filesize));
        const invalidReason = attachment.invalidReason;
        const mailSubject = attachment.mailSubject;
        const mailId = attachment.mailId;
        const isLatest = attachment.isLatest;
        const attachmentDate = this.processData(attachment.date || attachment.totime, 'createSafeDate');
        const dateStr = attachmentDate ? this.formatDate(attachmentDate, 'MM-DD HH:mm') : '未知时间';
        const senderName = attachment.senderName || '未知发件人';
        
        // 获取文件图标和缩略图
        const fileIcon = this.getFileIcon(fileName);
        const thumbnailUrl = this.getThumbnailUrl(attachment);
        const supportsThumbnail = this.supportsThumbnail(fileName);
        
        const element = this.createUI('div', {
            styles: `padding: 12px; background: white; border-radius: 8px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); cursor: pointer; transition: all 0.2s; margin-bottom: 8px;`,
            content: `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <!-- 文件图标/缩略图 -->
                        <div class="file-preview-container" style="width: 48px; height: 48px; border-radius: 6px; background: var(--base_gray_005, rgba(22, 46, 74, 0.05)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); overflow: hidden; position: relative;">
                            ${supportsThumbnail && thumbnailUrl ? 
                                `<img class="file-thumbnail" src="${thumbnailUrl}" alt="${fileName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 5px; opacity: 0; transition: opacity 0.3s;" data-fallback-icon="${fileIcon}">
                                 <span class="file-icon-fallback" style="font-size: 16px; display: none; position: absolute; width: 100%; height: 100%; align-items: center; justify-content: center;">${fileIcon}</span>` : 
                                `<span style="font-size: 16px;">${fileIcon}</span>`
                            }
                        </div>
                        
                        <!-- 文件信息 -->
                    <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <div style="font-weight: 600; color: var(--base_gray_090, rgba(22, 30, 38, 0.9)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; flex: 1;">
                                    ${fileName}
                        </div>
                                ${isLatest ? '<span style="background: var(--theme_success, #28a745); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; white-space: nowrap;">最新</span>' : ''}
                                ${invalidReason ? `<span style="background: var(--theme_danger_light, rgba(220, 53, 69, 0.1)); color: var(--theme_danger, #dc3545); padding: 2px 6px; border-radius: 4px; font-size: 10px; white-space: nowrap;">${invalidReason}</span>` : ''}
                        </div>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                                <span>${fileSize}</span>
                                <span>•</span>
                                <span>${dateStr}</span>
                                <span>•</span>
                                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${senderName}</span>
                    </div>
                            <div style="font-size: 11px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                来自: ${mailSubject}
                            </div>
                        </div>
                    </div>
                    <div style="color: var(--base_gray_040, rgba(22, 30, 38, 0.4)); margin-left: 12px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                    </div>
                </div>
            `,
            events: {
                click: () => this.openMail(mailId),
                mouseenter: (e) => e.target.style.background = 'var(--base_gray_005, rgba(22, 46, 74, 0.05))',
                mouseleave: (e) => e.target.style.background = 'white'
            }
        });
        
        return element.outerHTML;
    }

    // 渲染重复附件组项目（用于详细列表对话框）
    renderDuplicateGroupItem(group, index) {
        if (!group || group.length === 0) return '';
        
        const fileName = group[0].name;
        const fileSize = this.formatFileSize(parseInt(group[0].size) || parseInt(group[0].filesize));
        const duplicateCount = group.length;
        const fileIcon = this.getFileIcon(fileName);
        
        // 获取缩略图信息（使用组中第一个附件）
        const firstAttachment = group[0];
        const thumbnailUrl = this.getThumbnailUrl(firstAttachment);
        const supportsThumbnail = this.supportsThumbnail(fileName);
        
        // 找出最新的附件（按时间排序）
        const sortedGroup = [...group].sort((a, b) => {
            const dateA = this.processData(a.date || a.totime, 'createSafeDate');
            const dateB = this.processData(b.date || b.totime, 'createSafeDate');
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB.getTime() - dateA.getTime();
        });
        
        const latestAttachment = sortedGroup[0];
        const groupWithLatestFlag = group.map(attachment => ({
            ...attachment,
            isLatest: attachment === latestAttachment
        }));
        
        const element = this.createUI('div', {
            styles: `padding: 16px; background: white; border-radius: 8px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); margin-bottom: 8px;`,
            content: `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <!-- 文件图标/缩略图 -->
                    <div class="file-preview-container" style="width: 40px; height: 40px; border-radius: 8px; background: var(--base_gray_005, rgba(22, 46, 74, 0.05)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); overflow: hidden; position: relative;">
                        ${supportsThumbnail && thumbnailUrl ? 
                            `<img class="file-thumbnail" src="${thumbnailUrl}" alt="${fileName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 7px; opacity: 0; transition: opacity 0.3s;" data-fallback-icon="${fileIcon}">
                             <span class="file-icon-fallback" style="font-size: 16px; display: none; position: absolute; width: 100%; height: 100%; align-items: center; justify-content: center;">${fileIcon}</span>` : 
                            `<span style="font-size: 16px;">${fileIcon}</span>`
                        }
                    </div>
                    
                    <!-- 文件信息 -->
                    <div style="flex: 1; min-width: 0;">
                        <!-- 文件头部信息 -->
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <div style="font-weight: 600; color: var(--base_gray_090, rgba(22, 30, 38, 0.9)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; flex: 1;">
                                ${fileName}
                            </div>
                            <span style="background: var(--theme_warning_light, rgba(255, 193, 7, 0.1)); color: var(--theme_warning, #ffc107); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap;">
                                重复 ${duplicateCount} 次
                            </span>
                        </div>
                        
                        <!-- 文件基本信息 -->
                        <div style="font-size: 13px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); margin-bottom: 12px;">
                            文件大小: ${fileSize}
                        </div>
                        
                        <!-- 重复附件详情列表 -->
                        <div style="border-top: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); padding-top: 12px;">
                            <div style="font-size: 12px; color: var(--base_gray_070, rgba(22, 30, 38, 0.7)); margin-bottom: 8px; font-weight: 500;">
                                重复附件详情:
                            </div>
                            <div id="duplicate-items-container-${index}" style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;">
                                ${groupWithLatestFlag.map((attachment, idx) => {
                                    const attachmentDate = this.processData(attachment.date || attachment.totime, 'createSafeDate');
                                    const dateStr = attachmentDate ? this.formatDate(attachmentDate, 'MM-DD HH:mm') : '未知时间';
                                    const senderName = attachment.senderName || '未知发件人';
                                    const mailSubject = attachment.mailSubject || '未知邮件';
                                    const isLatest = attachment.isLatest;
                                    
                                    return `
                                        <div class="duplicate-item" data-mail-id="${attachment.mailId}" style="padding: 8px 12px; background: var(--base_gray_005, rgba(22, 46, 74, 0.05)); border-radius: 6px; border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1)); cursor: pointer; transition: all 0.2s;">
                                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                                <div style="flex: 1; min-width: 0;">
                                                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                                        <span style="font-size: 11px; color: var(--base_gray_070, rgba(22, 30, 38, 0.7)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                                                            ${mailSubject}
                                                        </span>
                                                        ${isLatest ? '<span style="background: var(--theme_success, #28a745); color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: 500;">最新</span>' : ''}
                                                    </div>
                                                    <div style="font-size: 10px; color: var(--base_gray_050, rgba(22, 30, 38, 0.5)); display: flex; align-items: center; gap: 8px;">
                                                        <span>${senderName}</span>
                                                        <span>•</span>
                                                        <span>${dateStr}</span>
                                                    </div>
                                                </div>
                                                <div style="color: var(--base_gray_040, rgba(22, 30, 38, 0.4)); font-size: 10px;">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                                        <polyline points="15 3 21 3 21 9"/>
                                                        <line x1="10" y1="14" x2="21" y2="3"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `
        });
        
        return element.outerHTML;
    }
    

    
    // 打开邮件
    openMail(mailId) {
        if (!mailId) {
            this.showToast('无法打开邮件：邮件ID无效', 'error');
            return;
        }
        
        try {
            // 构建邮件URL - 使用正确的QQ邮箱URL格式
            const currentUrl = window.location.href;
            const baseUrl = currentUrl.split('#')[0];
            const mailUrl = `${baseUrl}#/read/${mailId}`;
            
            // 在新标签页中打开
            window.open(mailUrl, '_blank');
            this.showToast('正在新标签页中打开邮件...', 'info');
        } catch (error) {
            console.error('打开邮件失败:', error);
            this.showToast('打开邮件失败', 'error');
        }
    }

    // 打开验证设置
    openValidationSettings() {
        try {
            // 直接调用设置对话框，并切换到文件命名标签页
            this.showSettingsDialog().then(() => {
                // 等待对话框创建完成后切换到文件命名标签页
                setTimeout(() => {
                    this.switchSettingsTab('file-naming');
                    
                    // 滚动到验证规则部分
                    setTimeout(() => {
                        const validationSection = document.querySelector('#validation-enabled');
                        if (validationSection) {
                            validationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // 高亮显示验证规则区域
                            const validationContainer = validationSection.closest('.setting-group');
                            if (validationContainer) {
                                validationContainer.style.transition = 'all 0.3s ease';
                                validationContainer.style.background = 'rgba(0, 123, 255, 0.1)';
                                validationContainer.style.borderRadius = '8px';
                                validationContainer.style.padding = '16px';
                                
                                // 3秒后移除高亮
                                setTimeout(() => {
                                    validationContainer.style.background = '';
                                    validationContainer.style.padding = '';
                                }, 3000);
                            }
                        }
                    }, 200);
                }, 100);
            });
            
            this.showToast('正在打开验证规则设置...', 'info');
        } catch (error) {
            console.error('打开设置失败:', error);
            this.showToast('打开设置失败', 'error');
        }
    }

    // 生成文件夹结构预览
    generateFolderStructurePreview(attachments) {
        const folderStructure = this.downloadSettings.folderStructure;
        
        if (folderStructure === 'flat') {
            return null; // 平铺模式不显示文件夹结构
        }
        
        // 取前几个附件作为示例
        const sampleAttachments = attachments.slice(0, 3);
        const folders = new Set();
        
        sampleAttachments.forEach(attachment => {
            let folderPath = '';
            
            switch (folderStructure) {
                case 'subject':
                    folderPath = this.sanitizeFileName(attachment.mailSubject || attachment.subject || '未知主题', attachment);
                    break;
                case 'sender':
                    folderPath = attachment.senderEmail || attachment.sender || '未知发件人';
                    break;
                case 'date':
                    const mailDate = attachment.date || attachment.totime ? 
                        new Date(typeof (attachment.date || attachment.totime) === 'number' && (attachment.date || attachment.totime) < 10000000000 ? 
                            (attachment.date || attachment.totime) * 1000 : (attachment.date || attachment.totime)) : new Date();
                    folderPath = this.formatDate(mailDate, 'MM-DD');
                    break;
                case 'custom':
                    const customTemplate = this.downloadSettings.folderNaming?.customTemplate || '{date:YYYY-MM-DD}/{senderName}';
                    const variableData = this.buildVariableData(attachment);
                    folderPath = this.replaceVariablesInTemplate(customTemplate, variableData);
                    // 确保预览显示正确，如果变量替换失败则使用示例数据
                    if (folderPath === customTemplate || folderPath.includes('{') || folderPath.includes('}')) {
                        const now = new Date();
                        const exampleData = {
                            date: now,
                            senderName: attachment.senderName || attachment.sender || '示例发件人',
                            subject: attachment.mailSubject || attachment.subject || '示例主题',
                            senderEmail: attachment.senderEmail || 'example@qq.com'
                        };
                        folderPath = this.replaceVariablesInTemplate(customTemplate, exampleData);
                    }
                    break;
            }
            
            if (folderPath) {
                folders.add(folderPath);
            }
        });
        
        const folderArray = Array.from(folders);
        const maxDisplay = 3;
        const hasMore = folderArray.length > maxDisplay;
        const displayFolders = folderArray.slice(0, maxDisplay);
        
        return {
            folders: displayFolders,
            hasMore,
            totalCount: folderArray.length,
            structure: folderStructure
        };
    }

    // 更新文件夹结构预览显示
    updateFolderStructurePreview(attachments) {
        const previewCard = document.getElementById('folder-structure-preview-card');
        const previewContent = document.getElementById('folder-structure-preview-content');
        
        if (!previewCard || !previewContent) return;
        
        const preview = this.generateFolderStructurePreview(attachments);
        
        if (preview) {
            previewCard.style.display = 'block';
            previewContent.innerHTML = preview.folders.slice(0, 3).map(folder => `📁 ${folder}`).join('<br>') + 
                (preview.folders.length > 3 ? `<br><span style="color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">... 共 ${preview.folders.length} 个文件夹</span>` : '');
        } else {
            previewCard.style.display = 'none';
        }
    }

    createHeaderCard() {
        const folderName = this.getFolderDisplayName();
        const headerCard = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoCardHeader,
            content: `
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button style="background: none; border: none; padding: 8px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); cursor: pointer; border-radius: 6px; transition: all 0.2s ease;" id="back-btn" title="返回邮件列表">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                        </svg>
                    </button>
                    <div style="flex: 1;">
                        <div style="${StyleManager.getStyles().texts.headerTitle}">${folderName}</div>
                        <div style="${StyleManager.getStyles().texts.headerSubtitle}" id="attachment-count-info">实时分析邮箱附件分布情况</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button style="${StyleManager.getStyles().texts.actionButtonSecondary}" id="settings-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        设置
                    </button>
                    <button style="${StyleManager.getStyles().texts.actionButtonSecondary}${!window.showDirectoryPicker ? '; opacity: 0.5; cursor: not-allowed;' : ''}" id="compare-btn" ${!window.showDirectoryPicker ? 'disabled title="需要 Chrome 86+ 或 Edge 86+ 浏览器支持"' : ''}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/>
                            <path d="M19 11h-4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/>
                            <path d="M12 2v9"/>
                            <path d="M8 6l4-4 4 4"/>
                        </svg>
                        对比本地
                    </button>
                </div>
            `,
            events: {
                click: (e) => {
                    if (e.target.id === 'back-btn' || e.target.closest('#back-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.hideAttachmentView();
                    } else if (e.target.id === 'settings-btn' || e.target.closest('#settings-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showSettingsDialog();
                    } else if (e.target.id === 'compare-btn' || e.target.closest('#compare-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showCompareDialog();
                    }
                }
            }
        });

        // 添加按钮悬停效果
        const backBtn = headerCard.querySelector('#back-btn');
        const settingsBtn = headerCard.querySelector('#settings-btn');
        const compareBtn = headerCard.querySelector('#compare-btn');
        
        if (backBtn) {
            backBtn.addEventListener('mouseenter', () => {
                backBtn.style.background = 'var(--base_gray_005, rgba(20, 46, 77, 0.05))';
                backBtn.style.color = 'var(--base_gray_080, rgba(22, 30, 38, 0.8))';
            });
            backBtn.addEventListener('mouseleave', () => {
                backBtn.style.background = 'none';
                backBtn.style.color = 'var(--base_gray_060, rgba(22, 30, 38, 0.6))';
            });
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('mouseenter', () => {
                StyleManager.applyInteractionStyle(settingsBtn, 'actionButtonSecondaryHover');
            });
            settingsBtn.addEventListener('mouseleave', () => {
                StyleManager.applyInteractionStyle(settingsBtn, 'actionButtonSecondaryHover', true);
            });
        }
        
        if (compareBtn) {
            compareBtn.addEventListener('mouseenter', () => {
                StyleManager.applyInteractionStyle(compareBtn, 'actionButtonSecondaryHover');
            });
            compareBtn.addEventListener('mouseleave', () => {
                StyleManager.applyInteractionStyle(compareBtn, 'actionButtonSecondaryHover', true);
            });
        }

        return headerCard;
    }

    createMainFunctionRow() {
        const row = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoRowResponsive,
            className: 'bento-row-responsive',
            content: `
                <div style="${StyleManager.getStyles().layouts.bentoCardPrimary}">
                    <div style="display: flex; flex-direction: column; height: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoLabelLarge}">📎 附件下载</div>
                            <div style="opacity: 0.6;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7,10 12,15 17,10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            </div>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: center;">
                            <div style="${StyleManager.getStyles().texts.bentoNumberLarge}" id="attachment-count">计算中...</div>
                            <div style="${StyleManager.getStyles().texts.bentoDescLarge}; margin-top: 6px;" id="total-size">计算中...</div>
                            <div id="folder-structure-preview-card" style="margin-top: 12px; display: none;">
                                <div style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6)); margin-bottom: 6px;">文件夹结构预览</div>
                                <div id="folder-structure-preview-content" style="background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); padding: 8px 12px; border-radius: 6px; font-size: 11px; font-family: monospace; color: var(--base_gray_080, rgba(22, 30, 38, 0.8)); text-align: left; max-height: 80px; overflow-y: auto;">
                                </div>
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoDescLarge}; font-weight: 600;">点击下载全部附件</div>
                        </div>
                    </div>
                </div>
                <div style="${StyleManager.getStyles().layouts.bentoCard}">
                    <div style="display: flex; flex-direction: column; height: 100%;">
                        <div style="margin-bottom: 16px;">
                            <div style="${StyleManager.getStyles().texts.bentoTitle}">📊 统计概览</div>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1));">
                                <span style="font-size: 14px; color: var(--base_gray_070, rgba(22, 30, 38, 0.7));">邮件总数</span>
                                <span style="font-size: 16px; font-weight: 600; color: var(--base_gray_100, #13181D);" id="quick-mail-count">计算中...</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.1));">
                                <span style="font-size: 14px; color: var(--base_gray_070, rgba(22, 30, 38, 0.7));">发件人数量</span>
                                <span style="font-size: 16px; font-weight: 600; color: var(--base_gray_100, #13181D);" id="quick-sender-count">计算中...</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                                <span style="font-size: 14px; color: var(--base_gray_070, rgba(22, 30, 38, 0.7));">无附件邮件</span>
                                <span style="font-size: 16px; font-weight: 600; color: var(--base_gray_100, #13181D);" id="quick-no-attachment-mails">计算中...</span>
                            </div>
                        </div>
                    </div>
                </div>
            `
        });
        
        // 添加下载点击事件和悬停效果到第一个卡片
        const downloadCard = row.children[0];
        const operationCard = row.children[1];
        
        downloadCard.addEventListener('click', () => {
            this.downloadAll();
        });
        
        // 添加悬停效果
        downloadCard.addEventListener('mouseenter', () => {
            StyleManager.applyInteractionStyle(downloadCard, 'cardPrimaryHover');
        });
        downloadCard.addEventListener('mouseleave', () => {
            StyleManager.applyInteractionStyle(downloadCard, 'cardPrimaryHover', true);
        });
        
        // 移除统计卡片的悬停效果，因为它不可点击
        
        return row;
    }

    createMailStatsCard(totalMails) {
        const card = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoCard,
            content: `
                <div style="margin-bottom: 16px;">
                    <div style="${StyleManager.getStyles().texts.bentoTitle}">邮件统计概览</div>
                </div>
                <div style="${StyleManager.getStyles().layouts.bentoStatsResponsive}" class="bento-stats-responsive">
                    <div style="text-align: center; padding: 16px;">
                        <div style="${StyleManager.getStyles().texts.bentoNumber}">${totalMails}</div>
                        <div style="${StyleManager.getStyles().texts.bentoLabel}">有附件邮件</div>
                        <div style="${StyleManager.getStyles().texts.bentoDesc}">包含附件的邮件总数</div>
                    </div>
                    <div style="text-align: center; padding: 16px;">
                        <div style="${StyleManager.getStyles().texts.bentoNumber}" id="sender-count">计算中...</div>
                        <div style="${StyleManager.getStyles().texts.bentoLabel}">发件人数量</div>
                        <div style="${StyleManager.getStyles().texts.bentoDesc}">不同发件人总数</div>
                    </div>
                                        <div style="text-align: center; padding: 16px;">
                        <div style="${StyleManager.getStyles().texts.bentoNumber}" id="no-attachment-mails">计算中...</div>
                        <div style="${StyleManager.getStyles().texts.bentoLabel}">无附件邮件</div>
                        <div style="${StyleManager.getStyles().texts.bentoDesc}">需要检查的邮件</div>
                    </div>
                </div>
            `
        });
        return card;
    }

    createNoAttachmentListCard() {
        const card = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoCard + '; display: none;',
            className: 'bento-card no-attachment-list-card',
            content: `
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="${StyleManager.getStyles().texts.bentoTitle}">无附件邮件列表</div>
                        <button id="view-all-no-attachment-mails" style="padding: 6px 12px; font-size: 12px; background: var(--theme_primary, #007bff); color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            查看完整列表
                        </button>
                    </div>
                    <div style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">点击邮件可在新标签页中打开</div>
                </div>
                <div id="no-attachment-list-container" style="max-height: 300px; overflow-y: auto;">
                    <div style="text-align: center; padding: 20px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                        加载中...
                    </div>
                </div>
            `,
            events: {
                click: (e) => {
                    if (e.target.id === 'view-all-no-attachment-mails' || e.target.closest('#view-all-no-attachment-mails')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showDetailList('no-attachment');
                    }
                }
            }
        });
        return card;
    }

    createInvalidNamingListCard() {
        const card = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoCard + '; display: none;',
            className: 'bento-card invalid-naming-list-card',
            content: `
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div style="${StyleManager.getStyles().texts.bentoTitle}">命名异常附件列表</div>
                        <div style="display: flex; gap: 8px;">
                            <button id="view-all-invalid-naming" style="padding: 6px 12px; font-size: 12px; background: var(--theme_success, #28a745); color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                查看完整列表
                            </button>
                            <button id="open-validation-settings" class="validation-settings-btn" style="padding: 6px 12px; font-size: 12px; background: var(--theme_primary, #007bff); color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                            修改验证规则
                        </button>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">点击附件可在新标签页中打开对应邮件</div>
                </div>
                <div id="invalid-naming-list-container" style="max-height: 300px; overflow-y: auto;">
                    <div style="text-align: center; padding: 20px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                        加载中...
                    </div>
                </div>
            `,
            events: {
                click: (e) => {
                    if (e.target.id === 'view-all-invalid-naming' || e.target.closest('#view-all-invalid-naming')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showDetailList('invalid-naming');
                    } else if (e.target.id === 'open-validation-settings' || e.target.closest('#open-validation-settings')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openValidationSettings();
                    }
                }
            }
        });
        return card;
    }

    // 创建重复附件列表卡片
    createDuplicateAttachmentsListCard() {
        const card = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoCard + '; display: none;',
            className: 'bento-card duplicate-attachments-list-card',
            content: `
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div style="${StyleManager.getStyles().texts.bentoTitle}">重复附件列表</div>
                        <button id="view-all-duplicate-attachments" style="padding: 6px 12px; font-size: 12px; background: var(--theme_warning, #ffc107); color: #212529; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s; font-weight: 500;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            查看完整列表
                        </button>
                    </div>
                    <div style="font-size: 12px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">点击附件可在新标签页中打开对应邮件</div>
                </div>
                <div id="duplicate-attachments-list-container" style="max-height: 300px; overflow-y: auto;">
                    <div style="text-align: center; padding: 20px; color: var(--base_gray_060, rgba(22, 30, 38, 0.6));">
                        加载中...
                    </div>
                </div>
            `,
            events: {
                click: (e) => {
                    if (e.target.id === 'view-all-duplicate-attachments' || e.target.closest('#view-all-duplicate-attachments')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showDetailList('duplicate-attachments');
                    }
                }
            }
        });
        return card;
    }

    createFileTypeRow() {
        const row = this.createUI('div', {
            styles: StyleManager.getStyles().layouts.bentoRowResponsive,
            className: 'bento-row-responsive',
            content: `
                <div style="${StyleManager.getStyles().layouts.bentoCard}">
                    <div style="margin-bottom: 16px;">
                        <div style="${StyleManager.getStyles().texts.bentoTitle}">文件类型分布</div>
                    </div>
                    <div style="${StyleManager.getStyles().layouts.bentoStatsResponsive}" class="bento-stats-responsive">
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="image-files">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">图片</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">JPG, PNG, GIF等</div>
                        </div>
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="archive-files">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">压缩包</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">ZIP, RAR, 7Z等</div>
                        </div>
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="document-files">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">文档</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">PDF, DOC, XLS等</div>
                        </div>
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="other-files">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">其他</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">其他格式文件</div>
                        </div>
                    </div>
                </div>
                <div style="${StyleManager.getStyles().layouts.bentoCard}">
                    <div style="margin-bottom: 16px;">
                        <div style="${StyleManager.getStyles().texts.bentoTitle}">问题文件检测</div>
                    </div>
                    <div style="${StyleManager.getStyles().layouts.bentoStatsResponsive}" class="bento-stats-responsive">
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="invalid-naming">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">命名异常</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">无扩展名、空文件、特殊字符等</div>
                        </div>
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="large-files">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">超大文件</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">&gt;10MB</div>
                        </div>
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="duplicate-attachments">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">重复文件</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">相同名称且相同大小的文件</div>
                        </div>
                        <div style="text-align: center; padding: 12px;">
                            <div style="${StyleManager.getStyles().texts.bentoNumber}" id="duplicate-mails">0</div>
                            <div style="${StyleManager.getStyles().texts.bentoLabel}">重复邮件</div>
                            <div style="${StyleManager.getStyles().texts.bentoDesc}">相同发件人的相同主题且相同附件的邮件</div>
                        </div>
                    </div>
                </div>
            `
        });
        return row;
    }



    updateCardValue(card, value) {
        const numberElement = card.children[1];
        if (numberElement) {
            numberElement.textContent = value;
        }
    }

    updateElementById(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

        createBentoCard(label, value, description, size = 'normal', icon = '', action = '') {
            const isPrimary = size === 'primary';
            const sizeClass = isPrimary ? 'bentoCardPrimary' :
                size === 'wide' ? 'bentoCardWide' :
                size === 'tall' ? 'bentoCardTall' :
                size === 'small' ? 'bentoCardSmall' : '';

            const isClickable = action === 'download';
            let cardStyle = StyleManager.getStyles().layouts.bentoCard;
            if (sizeClass) {
                cardStyle += '; ' + StyleManager.getStyles().layouts[sizeClass];
            }
            // 只有可点击的卡片才添加cursor: pointer
            if (isClickable) {
                cardStyle += '; cursor: pointer;';
            }

            const numberStyle = isPrimary ? StyleManager.getStyles().texts.bentoNumberPrimary : StyleManager.getStyles().texts.bentoNumber;
            const labelStyle = isPrimary ? StyleManager.getStyles().texts.bentoLabelPrimary : StyleManager.getStyles().texts.bentoLabel;
            const descStyle = isPrimary ? StyleManager.getStyles().texts.bentoDescPrimary : StyleManager.getStyles().texts.bentoDesc;

            const card = this.createUI('div', {
                styles: cardStyle,
                content: `
                <div>
                    <div style="${numberStyle}">${value}</div>
                    <div style="${labelStyle}">${label}</div>
                </div>
                <div style="${descStyle}">${description}</div>
                ${isClickable ? `<div style="position: absolute; top: 16px; right: 16px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </div>` : ''}
            `,
                events: isClickable ? {
                    mouseenter: (e) => {
                        if (isPrimary) {
                            StyleManager.applyInteractionStyle(e.target, 'cardPrimaryHover');
                        } else {
                            StyleManager.applyInteractionStyle(e.target, 'cardHover');
                        }
                    },
                    mouseleave: (e) => {
                        StyleManager.applyInteractionStyle(e.target, isPrimary ? 'cardPrimaryHover' : 'cardHover', true);
                    },
                    click: () => {
                        if (action === 'download') {
                            this.downloadAll();
                        }
                    }
                } : {}
            });

            return card;
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        // 保留这些方法以防其他地方需要使用，但简化实现
        async renderGroupsInBatches(groups, container) {
            // 简化版本，不再使用
            return;
        }

        createGroupContainer(group, index) {
            // 简化版本，不再使用
            return this.createUI('div');
    }

    createAndInjectButton() {
        console.log('[按钮创建] 开始创建附件管理按钮');
        
        // 先清理已存在的按钮 - 使用更全面的清理方式
        const existingButtons = document.querySelectorAll('#attachment-downloader-btn, [data-attachment-manager-btn="true"], .attachment-floating-btn');
        if (existingButtons.length > 0) {
            console.log('[按钮创建] 清理已存在的按钮，数量:', existingButtons.length);
            existingButtons.forEach(btn => btn.remove());
        }

        // 检查屏幕宽度决定显示方式
        const screenWidth = window.innerWidth;
        console.log('[按钮创建] 屏幕宽度:', screenWidth);
        
        try {
            if (screenWidth < 1340) {
                this.createFloatingButton();
            } else {
                this.createToolbarButton();
            }
            
            // 设置按钮重复检查机制
            this.setupButtonDuplicationCheck();
            
            // 设置窗口大小变化监听
            this.setupResponsiveListener();
            
            console.log('[按钮创建] 附件管理按钮创建完成');
        } catch (error) {
            console.error('[按钮创建] 创建按钮时出现错误:', error);
            // 延迟重试
            setTimeout(() => {
                console.log('[按钮创建] 重试创建按钮');
                this.createAndInjectButton();
            }, 2000);
        }
    }

    createToolbarButton() {
            // 尝试多个可能的工具栏选择器
            const toolbarSelectors = [
                '.xmail-ui-ellipsis-toolbar .ui-ellipsis-toolbar-btns',
                '.ui-ellipsis-toolbar-btns',
                '.toolbar-btns',
                '.mail-toolbar .toolbar-btns',
                '.xmail-ui-toolbar .ui-toolbar-btns',
                '.toolbar-right',
                '.toolbar-actions'
            ];

            let toolbar = null;
            for (const selector of toolbarSelectors) {
                toolbar = document.querySelector(selector);
                if (toolbar) break;
            }

            if (!toolbar) {
                // 如果找不到工具栏，延迟重试
                setTimeout(() => this.createAndInjectButton(), 1000);
                return;
            }

            const button = this.createUI('button', {
                id: 'attachment-downloader-btn',
                className: 'xmail-ui-btn ui-btn-size32 ui-btn-border ui-btn-them-clear-gray',
                attributes: { 'data-attachment-manager-btn': 'true' },
                content: `
                    <span class="xmail-ui-icon ui-btn-icon" style="width: 16px; height: 16px; margin-right: 4px;">
                <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M768 810.7H256c-44.2 0-80-35.8-80-80V547.2c0-17.7 14.3-32 32-32s32 14.3 32 32v183.5c0 8.8 7.2 16 16 16h512c8.8 0 16-7.2 16-16V547.2c0-17.7 14.3-32 32-32s32 14.3 32 32v183.5c0 44.2-35.8 80-80 80zM480 614.4c-8.2 0-16.4-3.1-22.6-9.4L234.8 382.3c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L480 536.7l199.9-199.7c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L502.6 605c-6.3 6.3-14.4 9.4-22.6 9.4z" fill="#2c2c2c"></path>
                    <path d="M512 646.4c-17.7 0-32-14.3-32-32V172.8c0-17.7 14.3-32 32-32s32 14.3 32 32v441.6c0 17.7-14.3 32-32 32z" fill="#2c2c2c"></path>
                </svg>
                    </span>
                    <span>附件管理</span>
                `,
                styles: { marginLeft: '8px' },
                events: {
                    click: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleAttachmentManager();
                    }
                }
            });

            toolbar.appendChild(button);
    }

    createFloatingButton() {
            // 添加浮动按钮样式
            this.addFloatingButtonStyles();

            const floatingButton = this.createUI('div', {
                className: 'attachment-floating-btn',
                attributes: { 'data-attachment-manager-btn': 'true' },
                content: `
                    <div class="floating-btn-icon">
                        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                            <path d="M768 810.7H256c-44.2 0-80-35.8-80-80V547.2c0-17.7 14.3-32 32-32s32 14.3 32 32v183.5c0 8.8 7.2 16 16 16h512c8.8 0 16-7.2 16-16V547.2c0-17.7 14.3-32 32-32s32 14.3 32 32v183.5c0 44.2-35.8 80-80 80zM480 614.4c-8.2 0-16.4-3.1-22.6-9.4L234.8 382.3c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L480 536.7l199.9-199.7c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L502.6 605c-6.3 6.3-14.4 9.4-22.6 9.4z" fill="currentColor"></path>
                            <path d="M512 646.4c-17.7 0-32-14.3-32-32V172.8c0-17.7 14.3-32 32-32s32 14.3 32 32v441.6c0 17.7-14.3 32-32 32z" fill="currentColor"></path>
                        </svg>
                    </div>
                    <div class="floating-btn-tooltip">附件管理</div>
                `,
                events: {
                    click: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleAttachmentManager();
                    }
                }
            });

            document.body.appendChild(floatingButton);
    }

    addFloatingButtonStyles() {
            // 检查是否已经添加了样式
            if (document.getElementById('attachment-floating-btn-styles')) {
                return;
            }

            const styles = document.createElement('style');
            styles.id = 'attachment-floating-btn-styles';
            styles.textContent = `
                .attachment-floating-btn {
                    position: fixed;
                    right: 20px;
                    bottom: 60px;
                    width: 56px;
                    height: 56px;
                    background: var(--theme_primary, #0F7AF5);
                    border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(15, 122, 245, 0.3);
                    cursor: pointer;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    user-select: none;
                }

                .attachment-floating-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(15, 122, 245, 0.4);
                    background: var(--theme_darken_1, #0E6FD9);
                }

                .attachment-floating-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(15, 122, 245, 0.3);
                }

                .floating-btn-icon {
                    width: 24px;
                    height: 24px;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .floating-btn-icon svg {
                    width: 100%;
                    height: 100%;
                }

                .floating-btn-tooltip {
                    position: absolute;
                    right: 64px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 14px;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s;
                    pointer-events: none;
                }

                .floating-btn-tooltip::after {
                    content: '';
                    position: absolute;
                    left: 100%;
                    top: 50%;
                    transform: translateY(-50%);
                    border: 6px solid transparent;
                    border-left-color: rgba(0, 0, 0, 0.8);
                }

                .attachment-floating-btn:hover .floating-btn-tooltip {
                    opacity: 1;
                    visibility: visible;
                }

                /* 响应式隐藏规则 */
                @media (min-width: 1300px) {
                    .attachment-floating-btn {
                        display: none !important;
                    }
                }

                @media (max-width: 1299px) {
                    #attachment-downloader-btn {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(styles);
    }

    setupResponsiveListener() {
            // 防抖函数
            let resizeTimeout;
            const handleResize = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    const screenWidth = window.innerWidth;
                    const hasToolbarBtn = document.getElementById('attachment-downloader-btn');
                    const hasFloatingBtn = document.querySelector('.attachment-floating-btn');

                    if (screenWidth < 1300 && hasToolbarBtn && !hasFloatingBtn) {
                        // 需要切换到浮动按钮
                        this.createAndInjectButton();
                    } else if (screenWidth >= 1300 && !hasToolbarBtn && hasFloatingBtn) {
                        // 需要切换到工具栏按钮
                        this.createAndInjectButton();
                    }
                }, 200);
            };

            // 移除旧的监听器
            if (this.resizeListener) {
                window.removeEventListener('resize', this.resizeListener);
            }

            this.resizeListener = handleResize;
            window.addEventListener('resize', this.resizeListener);
    }

    setupButtonDuplicationCheck() {
        // 防止重复按钮的观察器
        if (this.buttonObserver) {
            this.buttonObserver.disconnect();
        }
        
        this.buttonObserver = new MutationObserver((mutations) => {
            // 避免在面板初始化过程中进行检查
            if (this.isLoading) {
                return;
            }
            
            const buttons = document.querySelectorAll('#attachment-downloader-btn, [data-attachment-manager-btn="true"], .attachment-floating-btn');
            if (buttons.length > 1) {
                console.log('[按钮检查] 发现重复按钮，数量:', buttons.length);
                // 保留第一个，移除其他的
                for (let i = 1; i < buttons.length; i++) {
                    console.log('[按钮检查] 移除重复按钮:', buttons[i]);
                    buttons[i].remove();
                }
            }
        });
        
        this.buttonObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

class QQMailDownloader {
    constructor() {
        this.sid = null;
        this.headers = this._getDefaultHeaders();
        this.attachmentManager = null;
    }

    _getDefaultHeaders() {
        return {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
            'priority': 'u=0, i',
            'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'iframe',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1'
        };
    }

    async fetchAttachment(attachment) {
        try {
            // 构建初始URL
            const downloadUrlObj = new URL(attachment.download_url, MAIL_CONSTANTS.BASE_URL);
            const params = new URLSearchParams(downloadUrlObj.search);
            const pageUrl = new URL(window.location.href);
            const sid = pageUrl.searchParams.get('sid') || this.sid;
            const initialUrl = `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.ATTACH_DOWNLOAD}?mailid=${params.get('mailid')}&fileid=${params.get('fileid')}&name=${encodeURIComponent(attachment.name)}&sid=${sid}`;

            let finalDownloadUrl = null;

            try {
                // 尝试获取重定向URL
                finalDownloadUrl = await this._fetchRedirectUrl(initialUrl, attachment.name);
            } catch (redirectError) {

                // 回退方案1: 尝试直接使用原始下载URL
                if (attachment.download_url) {
                    let directUrl = attachment.download_url;
                    if (!directUrl.startsWith('http')) {
                        directUrl = MAIL_CONSTANTS.BASE_URL + directUrl;
                    }
                    // 确保包含SID参数
                    if (!directUrl.includes('sid=')) {
                        const separator = directUrl.includes('?') ? '&' : '?';
                        directUrl += `${separator}sid=${sid}`;
                    }
                    finalDownloadUrl = directUrl;
                } else {
                    // 回退方案2: 使用初始URL
                    finalDownloadUrl = initialUrl;
                }
            }

            // 获取文件内容
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: finalDownloadUrl,
                    headers: {
                        ...this.headers,
                        'Referer': MAIL_CONSTANTS.BASE_URL + '/'
                    },
                    responseType: 'blob',
                        onload: function (response) {
                        if (response.status === 200) {
                            resolve(response);
                        } else {
                            reject(new Error(`Failed to fetch content: ${response.status} ${response.statusText}`));
                        }
                    },
                        onerror: function (error) {
                        reject(error);
                    }
                });
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    async _fetchRedirectUrl(initialUrl, attachmentName) {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: initialUrl,
                    headers: {
                        ...this.headers,
                        'Referer': MAIL_CONSTANTS.BASE_URL + '/'
                    },
                        onload: function (response) {
                        if (response.status === 200) {
                            resolve(response);
                        } else {
                            reject(new Error(`Failed to fetch redirect: ${response.status}`));
                        }
                    },
                        onerror: function (error) {
                        reject(error);
                    }
                });
            });

            // 方法1: 检查是否已经重定向到最终URL
            if (response.finalUrl && response.finalUrl !== initialUrl) {
                return response.finalUrl;
            }

            // 方法2: 从响应中提取JavaScript重定向URL
            const responseText = response.responseText;

            // 尝试多种JavaScript重定向模式
            const redirectPatterns = [
                /window\.location\.href\s*=\s*['"]([^'"]+)['"]/,
                /location\.href\s*=\s*['"]([^'"]+)['"]/,
                /window\.location\s*=\s*['"]([^'"]+)['"]/,
                /location\s*=\s*['"]([^'"]+)['"]/,
                /window\.location\.replace\(['"]([^'"]+)['"]\)/,
                /location\.replace\(['"]([^'"]+)['"]\)/,
                /document\.location\s*=\s*['"]([^'"]+)['"]/,
                /document\.location\.href\s*=\s*['"]([^'"]+)['"]/
            ];

            for (const pattern of redirectPatterns) {
                const match = responseText.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // 方法3: 查找HTML meta refresh重定向
            const metaRefreshMatch = responseText.match(/<meta[^>]+http-equiv=['"]refresh['"][^>]+content=['"][^'"]*url=([^'"]+)['"]/i);
            if (metaRefreshMatch && metaRefreshMatch[1]) {
                return metaRefreshMatch[1];
            }

            // 方法4: 查找可能的下载链接
            const downloadLinkPatterns = [
                /href=['"]([^'"]*download[^'"]*)['"]/i,
                /url\(['"]([^'"]*download[^'"]*)['"]\)/i,
                /(https?:\/\/[^'">\s]+download[^'">\s]*)/i
            ];

            for (const pattern of downloadLinkPatterns) {
                const match = responseText.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // 方法5: 如果响应是JSON格式，尝试解析
            try {
                const jsonData = JSON.parse(responseText);
                if (jsonData.url || jsonData.download_url || jsonData.redirect_url) {
                    const foundUrl = jsonData.url || jsonData.download_url || jsonData.redirect_url;
                    return foundUrl;
                }
            } catch (e) {
                // 不是JSON格式，继续其他方法
            }

            throw new Error(`No redirect URL found in response for ${attachmentName}`);

        } catch (error) {
            throw error;
        }
    }

    async init() {
        this.sid = this.getSid();
        if (!this.sid) {
            return;
        }

        // 等待页面加载完成
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // 检查是否在登录页面
        if (window.location.pathname.includes('/login')) {
            this.handleLoginPage();
            return;
        }

        // 处理主页面
        this.attachmentManager = new AttachmentManager(this);
        // 设置全局引用，供HTML中的onclick使用
        window.attachmentManager = this.attachmentManager;
    }

    handleLoginPage() {
        // 可以添加登录页面的特定处理逻辑
    }

    handleMainPage() {
        // 初始化附件管理器
        this.attachmentManager = new AttachmentManager(this);
    }

    getSid() {
        // 优先从URL参数获取
        const urlParams = new URLSearchParams(window.location.search);
        let sid = urlParams.get('sid');
        if (sid) {
            return sid;
        }

        // 从URL hash中获取
        const hash = window.location.hash;
        const hashMatch = hash.match(/sid=([^&]+)/);
        if (hashMatch) {
            sid = hashMatch[1];
            return sid;
        }

        return '';
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    cleanup() {
        if (this.manager) {
            if (this.manager.container) {
                this.manager.container.remove();
            }
            this.manager = null;
        }
        if (this.boundFolderChangeHandler) {
            window.removeEventListener('hashchange', this.boundFolderChangeHandler, false);
            this.boundFolderChangeHandler = null;
        }
        this.isLoggedIn = false;
        this.currentFolderId = null;
        this.sid = null;
    }

    getCurrentFolderId() {
        const hash = window.location.hash;
        const listMatch = hash.match(/\/list\/(\d+)/);
        return listMatch ? listMatch[1] : '1';
    }

    async fetchMailList(folderId, pageNow = 0, pageSize = 50) {
        const requestUrl = this.buildMailListUrl(folderId, pageNow, pageSize);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: requestUrl,
                headers: this._getDefaultHeaders(),
                timeout: 15000,
                onload: (response) => this.handleMailListResponse(response, resolve, reject),
                onerror: () => reject(new Error('网络连接失败')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    buildMailListUrl(folderId, pageNow, pageSize) {
        const params = new URLSearchParams({
            r: Date.now(),
            sid: this.sid,
            dir: folderId,
            page_now: pageNow,
            page_size: pageSize,
            sort_type: 1,
            sort_direction: 1,
            func: 1,
            tag: '',
            enable_topmail: true
        });
        return `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.MAIL_LIST}?${params}`;
    }

    handleMailListResponse(response, resolve, reject) {
        const statusErrorMap = {
            302: '需要重新登录', 301: '需要重新登录', 403: '权限被拒绝，请重新登录'
        };

        if (response.status !== 200) {
            return reject(new Error(statusErrorMap[response.status] || `HTTP错误: ${response.status}`));
        }

        try {
            const data = JSON.parse(response.responseText);
            if (!data?.head) return reject(new Error('响应格式错误'));
            if (data.head.ret !== 0) return reject(new Error(`API错误: ${data.head.msg || data.head.ret}`));

            const result = data.body?.list ? {
                mails: data.body.list,
                total: data.body.total_num || data.body.list.length,
                unread: data.body.unread_num
            } : { mails: [], total: 0, unread: 0 };

            resolve(result);
        } catch {
            reject(new Error('响应不是有效的JSON格式'));
        }
    }

    async getAllMails(folderId) {
        const result = await this.fetchMailList(folderId, 0, 50);
                    return result.mails;
    }

    async getMailsWithPagination(folderId, maxPages = 5) {
        const allMails = [];
        let page = 0;
        const pageSize = 50;

        while (page < maxPages) {
            const result = await this.fetchMailList(folderId, page, pageSize);
            if (!result.mails?.length) break;

            allMails.push(...result.mails);
            if (result.mails.length < pageSize) break;
            
            page++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return allMails;
    }
}

// 初始化下载器
let downloader = null;
const observer = new MutationObserver(mutationCallback);

function initDownloader() {
        if (downloader?.attachmentManager) return;

        downloader = new QQMailDownloader();
        observer.disconnect();
        downloader.init();
}

function mutationCallback(mutationsList, obs) {
        if (document.querySelector('#mailMainApp') && !downloader?.attachmentManager) {
            initDownloader();
    }
}

function startObserver() {
        observer.observe(document.body, { childList: true, subtree: true });
}

(function initializeScript() {
    const initialize = () => {
        if (document.querySelector('#mailMainApp')) {
            initDownloader();
        } else {
            startObserver();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();

})();