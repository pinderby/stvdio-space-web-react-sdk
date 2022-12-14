/*
Copyright 2017 - 2019, 2021 The Matrix.org Foundation C.I.C.

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
import { Room } from 'matrix-js-sdk/src/models/room';
import { RoomMember } from 'matrix-js-sdk/src/models/room-member';
import PropTypes from 'prop-types';
import { logger } from "matrix-js-sdk/src/logger";

import dis from '../../../dispatcher/dispatcher';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import { getPrimaryPermalinkEntity, parsePermalink } from "../../../utils/permalinks/Permalinks";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { Action } from "../../../dispatcher/actions";
import Tooltip from './Tooltip';
import RoomAvatar from "../avatars/RoomAvatar";
import MemberAvatar from "../avatars/MemberAvatar";

class Pill extends React.Component {
    static roomNotifPos(text) {
        return text.indexOf("@room");
    }

    static roomNotifLen() {
        return "@room".length;
    }

    static TYPE_USER_MENTION = 'TYPE_USER_MENTION';
    static TYPE_ROOM_MENTION = 'TYPE_ROOM_MENTION';
    static TYPE_AT_ROOM_MENTION = 'TYPE_AT_ROOM_MENTION'; // '@room' mention

    static propTypes = {
        // The Type of this Pill. If url is given, this is auto-detected.
        type: PropTypes.string,
        // The URL to pillify (no validation is done)
        url: PropTypes.string,
        // Whether the pill is in a message
        inMessage: PropTypes.bool,
        // The room in which this pill is being rendered
        room: PropTypes.instanceOf(Room),
        // Whether to include an avatar in the pill
        shouldShowPillAvatar: PropTypes.bool,
        // Whether to render this pill as if it were highlit by a selection
        isSelected: PropTypes.bool,
    };

    state = {
        // ID/alias of the room/user
        resourceId: null,
        // Type of pill
        pillType: null,

        // The member related to the user pill
        member: null,
        // The room related to the room pill
        room: null,
        // Is the user hovering the pill
        hover: false,
    };

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    // eslint-disable-next-line camelcase
    async UNSAFE_componentWillReceiveProps(nextProps) {
        let resourceId;
        let prefix;

        if (nextProps.url) {
            if (nextProps.inMessage) {
                const parts = parsePermalink(nextProps.url);
                resourceId = parts.primaryEntityId; // The room/user ID
                prefix = parts.sigil; // The first character of prefix
            } else {
                resourceId = getPrimaryPermalinkEntity(nextProps.url);
                prefix = resourceId ? resourceId[0] : undefined;
            }
        }

        const pillType = this.props.type || {
            '@': Pill.TYPE_USER_MENTION,
            '#': Pill.TYPE_ROOM_MENTION,
            '!': Pill.TYPE_ROOM_MENTION,
        }[prefix];

        let member;
        let room;
        switch (pillType) {
            case Pill.TYPE_AT_ROOM_MENTION: {
                room = nextProps.room;
            }
                break;
            case Pill.TYPE_USER_MENTION: {
                const localMember = nextProps.room ? nextProps.room.getMember(resourceId) : undefined;
                member = localMember;
                if (!localMember) {
                    member = new RoomMember(null, resourceId);
                    this.doProfileLookup(resourceId, member);
                }
                break;
            }
            case Pill.TYPE_ROOM_MENTION: {
                const localRoom = resourceId[0] === '#' ?
                    MatrixClientPeg.get().getRooms().find((r) => {
                        return r.getCanonicalAlias() === resourceId ||
                               r.getAltAliases().includes(resourceId);
                    }) : MatrixClientPeg.get().getRoom(resourceId);
                room = localRoom;
                if (!localRoom) {
                    // TODO: This would require a new API to resolve a room alias to
                    // a room avatar and name.
                    // this.doRoomProfileLookup(resourceId, member);
                }
                break;
            }
        }
        this.setState({ resourceId, pillType, member, room });
    }

    componentDidMount() {
        this._unmounted = false;
        this._matrixClient = MatrixClientPeg.get();

        // eslint-disable-next-line new-cap
        this.UNSAFE_componentWillReceiveProps(this.props); // HACK: We shouldn't be calling lifecycle functions ourselves.
    }

    componentWillUnmount() {
        this._unmounted = true;
    }

    onMouseOver = () => {
        this.setState({
            hover: true,
        });
    };

    onMouseLeave = () => {
        this.setState({
            hover: false,
        });
    };

    doProfileLookup(userId, member) {
        MatrixClientPeg.get().getProfileInfo(userId).then((resp) => {
            if (this._unmounted) {
                return;
            }
            member.name = resp.displayname;
            member.rawDisplayName = resp.displayname;
            member.events.member = {
                getContent: () => {
                    return { avatar_url: resp.avatar_url };
                },
                getDirectionalContent: function() {
                    return this.getContent();
                },
            };
            this.setState({ member });
        }).catch((err) => {
            logger.error('Could not retrieve profile data for ' + userId + ':', err);
        });
    }

    onUserPillClicked = (e) => {
        e.preventDefault();
        dis.dispatch({
            action: Action.ViewUser,
            member: this.state.member,
        });
    };

    render() {
        const resource = this.state.resourceId;

        let avatar = null;
        let linkText = resource;
        let pillClass;
        let userId;
        let href = this.props.url;
        let onClick;
        switch (this.state.pillType) {
            case Pill.TYPE_AT_ROOM_MENTION: {
                const room = this.props.room;
                if (room) {
                    linkText = "@room";
                    if (this.props.shouldShowPillAvatar) {
                        avatar = <RoomAvatar room={room} width={16} height={16} aria-hidden="true" />;
                    }
                    pillClass = 'mx_AtRoomPill';
                }
                break;
            }
            case Pill.TYPE_USER_MENTION: {
                // If this user is not a member of this room, default to the empty member
                const member = this.state.member;
                if (member) {
                    userId = member.userId;
                    member.rawDisplayName = member.rawDisplayName || '';
                    linkText = member.rawDisplayName;
                    if (this.props.shouldShowPillAvatar) {
                        avatar = <MemberAvatar member={member} width={16} height={16} aria-hidden="true" />;
                    }
                    pillClass = 'mx_UserPill';
                    href = null;
                    onClick = this.onUserPillClicked;
                }
                break;
            }
            case Pill.TYPE_ROOM_MENTION: {
                const room = this.state.room;
                if (room) {
                    linkText = room.name || resource;
                    if (this.props.shouldShowPillAvatar) {
                        avatar = <RoomAvatar room={room} width={16} height={16} aria-hidden="true" />;
                    }
                }
                pillClass = 'mx_RoomPill';
                break;
            }
        }

        const classes = classNames("mx_Pill", pillClass, {
            "mx_UserPill_me": userId === MatrixClientPeg.get().getUserId(),
            "mx_UserPill_selected": this.props.isSelected,
        });

        if (this.state.pillType) {
            const { yOffset } = this.props;

            let tip;
            if (this.state.hover && resource) {
                tip = <Tooltip label={resource} yOffset={yOffset} />;
            }

            return <MatrixClientContext.Provider value={this._matrixClient}>
                { this.props.inMessage ?
                    <a
                        className={classes}
                        href={href}
                        onClick={onClick}
                        data-offset-key={this.props.offsetKey}
                        onMouseOver={this.onMouseOver}
                        onMouseLeave={this.onMouseLeave}
                    >
                        { avatar }
                        { linkText }
                        { tip }
                    </a> :
                    <span
                        className={classes}
                        data-offset-key={this.props.offsetKey}
                        onMouseOver={this.onMouseOver}
                        onMouseLeave={this.onMouseLeave}
                    >
                        { avatar }
                        { linkText }
                        { tip }
                    </span> }
            </MatrixClientContext.Provider>;
        } else {
            // Deliberately render nothing if the URL isn't recognised
            return null;
        }
    }
}

export default Pill;
