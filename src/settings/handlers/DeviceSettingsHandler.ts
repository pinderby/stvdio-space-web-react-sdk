/*
Copyright 2017 Travis Ralston
Copyright 2019 New Vector Ltd.
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { MatrixClientPeg } from "../../MatrixClientPeg";
import { SettingLevel } from "../SettingLevel";
import { CallbackFn, WatchManager } from "../WatchManager";
import AbstractLocalStorageSettingsHandler from "./AbstractLocalStorageSettingsHandler";

/**
 * Gets and sets settings at the "device" level for the current device.
 * This handler does not make use of the roomId parameter. This handler
 * will special-case features to support legacy settings.
 */
export default class DeviceSettingsHandler extends AbstractLocalStorageSettingsHandler {
    /**
     * Creates a new device settings handler
     * @param {string[]} featureNames The names of known features.
     * @param {WatchManager} watchers The watch manager to notify updates to
     */
    constructor(private featureNames: string[], public readonly watchers: WatchManager) {
        super();
    }

    public getValue(settingName: string, roomId: string): any {
        if (this.featureNames.includes(settingName)) {
            return this.readFeature(settingName);
        }

        // Special case notifications
        if (settingName === "notificationsEnabled") {
            const value = this.getItem("notifications_enabled");
            if (typeof(value) === "string") return value === "true";
            return null; // wrong type or otherwise not set
        } else if (settingName === "notificationBodyEnabled") {
            const value = this.getItem("notifications_body_enabled");
            if (typeof(value) === "string") return value === "true";
            return null; // wrong type or otherwise not set
        } else if (settingName === "audioNotificationsEnabled") {
            const value = this.getItem("audio_notifications_enabled");
            if (typeof(value) === "string") return value === "true";
            return null; // wrong type or otherwise not set
        }

        const settings = this.getSettings() || {};
        return settings[settingName];
    }

    public setValue(settingName: string, roomId: string, newValue: any): Promise<void> {
        if (this.featureNames.includes(settingName)) {
            this.writeFeature(settingName, newValue);
            return Promise.resolve();
        }

        // Special case notifications
        if (settingName === "notificationsEnabled") {
            this.setItem("notifications_enabled", newValue);
            this.watchers.notifyUpdate(settingName, null, SettingLevel.DEVICE, newValue);
            return Promise.resolve();
        } else if (settingName === "notificationBodyEnabled") {
            this.setItem("notifications_body_enabled", newValue);
            this.watchers.notifyUpdate(settingName, null, SettingLevel.DEVICE, newValue);
            return Promise.resolve();
        } else if (settingName === "audioNotificationsEnabled") {
            this.setItem("audio_notifications_enabled", newValue);
            this.watchers.notifyUpdate(settingName, null, SettingLevel.DEVICE, newValue);
            return Promise.resolve();
        }

        // Special case for old useIRCLayout setting
        if (settingName === "layout") {
            const settings = this.getSettings() || {};

            delete settings["useIRCLayout"];
            settings["layout"] = newValue;
            this.setObject("mx_local_settings", settings);

            this.watchers.notifyUpdate(settingName, null, SettingLevel.DEVICE, newValue);
            return Promise.resolve();
        }

        const settings = this.getSettings() || {};
        settings[settingName] = newValue;
        this.setObject("mx_local_settings", settings);
        this.watchers.notifyUpdate(settingName, null, SettingLevel.DEVICE, newValue);

        return Promise.resolve();
    }

    public canSetValue(settingName: string, roomId: string): boolean {
        return true; // It's their device, so they should be able to
    }

    public watchSetting(settingName: string, roomId: string, cb: CallbackFn) {
        this.watchers.watchSetting(settingName, roomId, cb);
    }

    public unwatchSetting(cb: CallbackFn) {
        this.watchers.unwatchSetting(cb);
    }

    private getSettings(): any { // TODO: [TS] Type return
        return this.getObject("mx_local_settings");
    }

    // Note: features intentionally don't use the same key as settings to avoid conflicts
    // and to be backwards compatible.

    private readFeature(featureName: string): boolean | null {
        if (MatrixClientPeg.get() && MatrixClientPeg.get().isGuest()) {
            // Guests should not have any labs features enabled.
            return false;
        }

        const value = this.getItem("mx_labs_feature_" + featureName);
        if (value === "true") return true;
        if (value === "false") return false;
        // Try to read the next config level for the feature.
        return null;
    }

    private writeFeature(featureName: string, enabled: boolean | null) {
        this.setItem("mx_labs_feature_" + featureName, `${enabled}`);
        this.watchers.notifyUpdate(featureName, null, SettingLevel.DEVICE, enabled);
    }
}
