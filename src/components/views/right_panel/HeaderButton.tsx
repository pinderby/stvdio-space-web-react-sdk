/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import classNames from 'classnames';

import Analytics from '../../../Analytics';
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import { ButtonEvent } from "../elements/AccessibleButton";

interface IProps {
    // Whether this button is highlighted
    isHighlighted: boolean;
    isUnread?: boolean;
    // click handler
    onClick: (ev: ButtonEvent) => void;
    // The parameters to track the click event
    analytics: Parameters<typeof Analytics.trackEvent>;

    // Button name
    name: string;
    // Button title
    title: string;
}

// TODO: replace this, the composer buttons and the right panel buttons with a unified representation
export default class HeaderButton extends React.Component<IProps> {
    private onClick = (ev: ButtonEvent) => {
        Analytics.trackEvent(...this.props.analytics);
        this.props.onClick(ev);
    };

    public render() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isHighlighted, isUnread = false, onClick, analytics, name, title, ...props } = this.props;

        const classes = classNames({
            mx_RightPanel_headerButton: true,
            mx_RightPanel_headerButton_highlight: isHighlighted,
            mx_RightPanel_headerButton_unread: isUnread,
            [`mx_RightPanel_${name}`]: true,
        });

        return <AccessibleTooltipButton
            {...props}
            aria-selected={isHighlighted}
            role="tab"
            title={title}
            className={classes}
            onClick={this.onClick}
        />;
    }
}
