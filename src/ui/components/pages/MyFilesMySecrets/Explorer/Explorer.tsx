import type { ReactNode } from "react";
import { makeStyles, Button } from "ui/theme";
import { useState, useEffect, useMemo, memo } from "react";
import type { RefObject } from "react";
import { useConstCallback } from "powerhooks/useConstCallback";
import type { ExplorerItemsProps as ItemsProps } from "./ExplorerItems/ExplorerItems";
import { Breadcrump } from "onyxia-ui/Breadcrump";
import type { BreadcrumpProps } from "onyxia-ui/Breadcrump";
import { Props as ButtonBarProps } from "./ExplorerButtonBar";
import { Evt } from "evt";
import { join as pathJoin, basename as pathBasename } from "path";
import { useTranslation } from "ui/i18n/useTranslations";
import { ApiLogsBar } from "./ApiLogsBar";
import {
    generateUniqDefaultName,
    buildNameFactory,
} from "ui/tools/generateUniqDefaultName";
import { assert } from "tsafe/assert";
import { id } from "tsafe/id";
import type { NonPostableEvt, StatefulReadonlyEvt, UnpackEvt } from "evt";
import { useEvt } from "evt/hooks";

import { ExplorerItems } from "./ExplorerItems";
import { ExplorerButtonBar } from "./ExplorerButtonBar";
//TODO: The margin was set to itself be mindful when replacing by the onyxia-ui version.
import { DirectoryHeader } from "onyxia-ui/DirectoryHeader";
import { useDomRect } from "onyxia-ui";
import { FileOrDirectoryIcon } from "./FileOrDirectoryIcon";
import { getFormattedDate } from "ui/i18n/useMoment";
import { Dialog } from "onyxia-ui/Dialog";
import { useCallbackFactory } from "powerhooks/useCallbackFactory";
import { Deferred } from "evt/tools/Deferred";
import type { ApiLogs } from "core/tools/apiLogger";
import { useConst } from "powerhooks/useConst";
import type { Param0 } from "tsafe";
import { useLng } from "ui/i18n/useLng";
import { Card } from "onyxia-ui/Card";
import { TextField } from "onyxia-ui/TextField";
import type { TextFieldProps } from "onyxia-ui/TextField";
import { useRerenderOnStateChange } from "evt/hooks/useRerenderOnStateChange";

export type ExplorerProps = {
    /**
     * For this component to work it must have a fixed width
     * For being able to scroll without moving the button bar it must have a fixed height.
     * */
    className?: string;
    explorerType: "s3" | "secrets";
    doShowHidden: boolean;

    directoryPath: string;
    isNavigating: boolean;
    apiLogs: ApiLogs;
    evtAction: NonPostableEvt<"TRIGGER COPY PATH">;
    files: string[];
    directories: string[];
    directoriesBeingCreated: string[];
    directoriesBeingRenamed: string[];
    filesBeingCreated: string[];
    filesBeingRenamed: string[];
    onNavigate: (params: { directoryPath: string }) => void;
    onRefresh: () => void;
    onEditBasename: (params: {
        kind: "file" | "directory";
        basename: string;
        newBasename: string;
    }) => void;
    onDeleteItem: (params: { kind: "file" | "directory"; basename: string }) => void;
    //NOTE: It can be a request to upload a file or creating a new secret
    onNewItem: (params: {
        kind: "file" | "directory";
        suggestedBasename: string;
    }) => void;
    onCopyPath: (params: { path: string }) => void;
    //Defines how hight users should be allowed to browse up in the path
    pathMinDepth: number;
    //TODO: Find a better way
    scrollableDivRef: RefObject<any>;
} & (
    | {
          isFileOpen: true;
          openFileBasename: string;
          /** Undefined when file is loading
           * TODO: Add a new state when file is opening, onClose and onRefresh should
           * not be clickable.
           */
          openFileTime: number | undefined;
          openFileNode: ReactNode;
          onCloseFile: () => void;
          onRefreshOpenFile: () => void;
      }
    | {
          isFileOpen: false;
          onOpenFile: (params: { basename: string }) => void;
      }
);

export const Explorer = memo((props: ExplorerProps) => {
    const {
        className,
        explorerType,
        doShowHidden,
        directoryPath,
        isNavigating,
        apiLogs,
        evtAction,
        onNavigate,
        onRefresh,
        onEditBasename,
        onDeleteItem,
        onNewItem,
        onCopyPath,
        scrollableDivRef,
        pathMinDepth,
    } = props;

    const [
        files,
        directories,
        directoriesBeingCreated,
        directoriesBeingRenamed,
        filesBeingCreated,
        filesBeingRenamed,
    ] = useMemo(
        () =>
            (
                [
                    props.files,
                    props.directories,
                    props.directoriesBeingCreated,
                    props.directoriesBeingRenamed,
                    props.filesBeingCreated,
                    props.filesBeingRenamed,
                ] as const
            ).map(
                doShowHidden
                    ? id
                    : arr => arr.filter(basename => !basename.startsWith(".")),
            ),
        [
            props.files,
            props.directories,
            props.directoriesBeingCreated,
            props.directoriesBeingRenamed,
            props.filesBeingCreated,
            props.filesBeingRenamed,
            doShowHidden,
        ],
    );

    const { t } = useTranslation({ Explorer });

    const [selectedItemKind, setSelectedItemKind] = useState<
        "file" | "directory" | "none"
    >("none");

    const onSelectedItemKindValueChange = useConstCallback(
        ({ selectedItemKind }: Param0<ItemsProps["onSelectedItemKindValueChange"]>) =>
            setSelectedItemKind(selectedItemKind),
    );

    const [isSelectedItemInEditingState, setIsSelectedItemInEditingState] =
        useState(false);

    const onIsSelectedItemInEditingStateValueChange = useConstCallback(
        ({
            isSelectedItemInEditingState,
        }: Param0<ItemsProps["onIsSelectedItemInEditingStateValueChange"]>) =>
            setIsSelectedItemInEditingState(isSelectedItemInEditingState),
    );

    const onBreadcrumpNavigate = useConstCallback(
        ({ upCount }: Param0<BreadcrumpProps["onNavigate"]>) => {
            onNavigate({
                "directoryPath": pathJoin(
                    directoryPath,
                    ...new Array(upCount - (props.isFileOpen ? 1 : 0)).fill(".."),
                ),
            });
        },
    );

    const onItemsNavigate = useConstCallback(
        ({ basename }: Param0<ItemsProps["onNavigate"]>) =>
            onNavigate({
                "directoryPath": pathJoin(directoryPath, basename),
            }),
    );

    const onItemsOpenFile = useConstCallback(
        ({ basename }: Param0<ItemsProps["onOpenFile"]>) => {
            assert(!props.isFileOpen);

            props.onOpenFile({ basename });
        },
    );

    const evtBreadcrumpAction = useConst(() =>
        Evt.create<UnpackEvt<BreadcrumpProps["evtAction"]>>(),
    );

    const itemsOnCopyPath = useConstCallback(
        ({ basename }: Parameters<ItemsProps["onCopyPath"]>[0]) => {
            evtBreadcrumpAction.post({
                "action": "DISPLAY COPY FEEDBACK",
                basename,
            });

            onCopyPath({ "path": pathJoin(directoryPath, basename) });
        },
    );

    const onGoBack = useConstCallback(() => {
        if (props.isFileOpen) {
            props.onCloseFile();
        } else {
            onNavigate({ "directoryPath": pathJoin(directoryPath, "..") });
        }
    });

    const { evtItemsAction } = useConst(() => ({
        "evtItemsAction": Evt.create<UnpackEvt<ItemsProps["evtAction"]>>(),
    }));

    const buttonBarCallback = useConstCallback<ButtonBarProps["callback"]>(buttonId => {
        switch (buttonId) {
            case "refresh":
                if (props.isFileOpen) {
                    props.onRefreshOpenFile();
                } else {
                    onRefresh();
                }
                break;
            case "rename":
                evtItemsAction.post("START EDITING SELECTED ITEM BASENAME");
                break;
            case "delete":
                evtItemsAction.post("DELETE SELECTED ITEM");
                break;
            case "copy path":
                if (props.isFileOpen) {
                    evtBreadcrumpAction.post({ "action": "DISPLAY COPY FEEDBACK" });

                    onCopyPath({
                        "path": pathJoin(directoryPath, props.openFileBasename),
                    });
                } else {
                    evtItemsAction.post("COPY SELECTED ITEM PATH");
                }
                break;
            case "create directory":
                setCreateS3DirectoryDialogState({
                    directories,
                    "resolveBasename": basename => {
                        onNewItem({
                            "kind": "directory",
                            "suggestedBasename": basename,
                        });
                    },
                });
                break;
            case "new":
                onNewItem({
                    "kind": "file" as const,
                    "suggestedBasename": generateUniqDefaultName({
                        "names": files,
                        "buildName": buildNameFactory({
                            "defaultName": t("untitled what", {
                                "what": t(
                                    (() => {
                                        switch (explorerType) {
                                            case "s3":
                                                return "file";
                                            case "secrets":
                                                return "secret";
                                        }
                                    })(),
                                ),
                            }),
                            "separator": "_",
                        }),
                    }),
                });
                break;
        }
    });

    useEvt(
        ctx =>
            evtAction.attach(
                action => action === "TRIGGER COPY PATH",
                ctx,
                () => buttonBarCallback("copy path"),
            ),

        [evtAction],
    );

    const { rootRef, buttonBarRef, apiLogBarTop, apiLogBarMaxHeight } =
        useApiLogsBarPositioning();

    const { classes, cx, css, theme } = useStyles({
        ...props,
        apiLogBarTop,
        "isOpenFileNodeNull": !props.isFileOpen ? true : props.openFileNode === null,
    });

    const { formattedDate } = (function useClosure() {
        const { lng } = useLng();

        const formattedDate = !props.isFileOpen ? undefined : props.openFileTime ===
          undefined ? (
            <>&nbsp;</>
        ) : (
            getFormattedDate({ "time": props.openFileTime, lng })
        );

        return { formattedDate };
    })();

    const [doShowDeletionDialogNextTime, setDoShowDeletionDialogNextTime] =
        useState(true);

    const [deletionDialogState, setDeletionDialogState] = useState<
        | {
              kind: "file" | "directory";
              basename: string;
              resolveDoProceedToDeletion: (doProceedToDeletion: boolean) => void;
          }
        | undefined
    >(undefined);

    const [createS3DirectoryDialogState, setCreateS3DirectoryDialogState] =
        useState<CreateS3DirectoryDialogProps["state"]>(undefined);

    const onCreateS3DirectoryDialogClose = useConstCallback(() =>
        setCreateS3DirectoryDialogState(undefined),
    );

    const onDeletionDialogClickFactory = useCallbackFactory(
        ([action]: ["cancel" | "delete"]) => {
            assert(deletionDialogState !== undefined);

            deletionDialogState.resolveDoProceedToDeletion(
                (() => {
                    switch (action) {
                        case "cancel":
                            return false;
                        case "delete":
                            return true;
                    }
                })(),
            );
        },
    );

    const itemsOnDeleteItem = useConstCallback(
        async ({ kind, basename }: Parameters<ItemsProps["onDeleteItem"]>[0]) => {
            if (doShowDeletionDialogNextTime) {
                const dDoProceedToDeletion = new Deferred();

                setDeletionDialogState({
                    kind,
                    basename,
                    "resolveDoProceedToDeletion": dDoProceedToDeletion.resolve,
                });

                const doProceedToDeletion = await dDoProceedToDeletion.pr;

                setDeletionDialogState(undefined);

                if (!doProceedToDeletion) {
                    return;
                }
            }

            onDeleteItem({ kind, basename });
        },
    );

    return (
        <>
            <div ref={rootRef} className={cx(classes.root, className)}>
                <div ref={buttonBarRef}>
                    <ExplorerButtonBar
                        explorerType={explorerType}
                        selectedItemKind={selectedItemKind}
                        isSelectedItemInEditingState={isSelectedItemInEditingState}
                        isFileOpen={props.isFileOpen}
                        callback={buttonBarCallback}
                    />
                </div>
                <ApiLogsBar
                    className={classes.apiLogBar}
                    apiLogs={apiLogs}
                    maxHeight={apiLogBarMaxHeight}
                />
                {(() => {
                    const title = props.isFileOpen
                        ? props.openFileBasename
                        : directoryPath.split("/").length - 1 === pathMinDepth
                        ? undefined
                        : pathBasename(directoryPath);

                    return title === undefined ? null : (
                        <DirectoryHeader
                            title={title}
                            onGoBack={onGoBack}
                            subtitle={formattedDate}
                            image={
                                <FileOrDirectoryIcon
                                    className={classes.fileOrDirectoryIcon}
                                    explorerType={explorerType}
                                    kind={props.isFileOpen ? "file" : "directory"}
                                />
                            }
                        />
                    );
                })()}
                <Breadcrump
                    className={classes.breadcrump}
                    minDepth={pathMinDepth}
                    path={[
                        ...directoryPath.split("/"),
                        ...(props.isFileOpen ? [props.openFileBasename] : []),
                    ]}
                    isNavigationDisabled={isNavigating}
                    onNavigate={onBreadcrumpNavigate}
                    evtAction={evtBreadcrumpAction}
                />
                <div
                    ref={scrollableDivRef}
                    className={cx(
                        css({
                            "flex": 1,
                            "paddingRight": theme.spacing(2),
                            "overflow": "auto",
                        }),
                    )}
                >
                    {props.isFileOpen ? (
                        <Card className={classes.openFile}>{props.openFileNode}</Card>
                    ) : (
                        <ExplorerItems
                            explorerType={explorerType}
                            isNavigating={isNavigating}
                            files={files}
                            directories={directories}
                            directoriesBeingCreated={directoriesBeingCreated}
                            directoriesBeingRenamed={directoriesBeingRenamed}
                            filesBeingCreated={filesBeingCreated}
                            filesBeingRenamed={filesBeingRenamed}
                            onNavigate={onItemsNavigate}
                            onOpenFile={onItemsOpenFile}
                            onEditBasename={onEditBasename}
                            onSelectedItemKindValueChange={onSelectedItemKindValueChange}
                            onIsSelectedItemInEditingStateValueChange={
                                onIsSelectedItemInEditingStateValueChange
                            }
                            onCopyPath={itemsOnCopyPath}
                            onDeleteItem={itemsOnDeleteItem}
                            evtAction={evtItemsAction}
                        />
                    )}
                </div>
            </div>
            <CreateS3DirectoryDialog
                state={createS3DirectoryDialogState}
                onClose={onCreateS3DirectoryDialogClose}
            />
            <Dialog
                {...(() => {
                    const deleteWhat =
                        deletionDialogState === undefined
                            ? ""
                            : t(
                                  (() => {
                                      switch (deletionDialogState.kind) {
                                          case "directory":
                                              return "directory";
                                          case "file":
                                              return (() => {
                                                  switch (explorerType) {
                                                      case "s3":
                                                          return "file";
                                                      case "secrets":
                                                          return "secret";
                                                  }
                                              })();
                                      }
                                  })(),
                              );

                    return {
                        "title": t("deletion dialog title", { deleteWhat }),
                        "body": t("deletion dialog body", { deleteWhat }),
                    };
                })()}
                isOpen={deletionDialogState !== undefined}
                onClose={onDeletionDialogClickFactory("cancel")}
                doNotShowNextTimeText={t("do not display again")}
                onDoShowNextTimeValueChange={setDoShowDeletionDialogNextTime}
                buttons={
                    <>
                        <Button
                            variant="secondary"
                            onClick={onDeletionDialogClickFactory("cancel")}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            autoFocus
                            onClick={onDeletionDialogClickFactory("delete")}
                        >
                            {t("delete")}
                        </Button>
                    </>
                }
            />
        </>
    );
});
export declare namespace Explorer {
    export type I18nScheme = {
        "untitled what": { what: string };
        directory: undefined;
        file: undefined;
        secret: undefined;
        cancel: undefined;
        delete: undefined;
        "deletion dialog title": { deleteWhat: string };
        "deletion dialog body": { deleteWhat: string };
        "do not display again": undefined;
        "already a directory with this name": undefined;
        "can't be empty": undefined;
        "create": undefined;
        "new directory": undefined;
    };
}

const useStyles = makeStyles<{ apiLogBarTop: number; isOpenFileNodeNull: boolean }>({
    "name": { Explorer },
})((theme, { apiLogBarTop, isOpenFileNodeNull }) => ({
    "root": {
        "position": "relative",
        "display": "flex",
        "flexDirection": "column",
    },
    "apiLogBar": {
        "position": "absolute",
        "right": 0,
        "width": "40%",
        "top": apiLogBarTop,
        "zIndex": 1,
        "opacity": apiLogBarTop === 0 ? 0 : 1,
        "transition": "opacity 750ms linear",
    },
    "openFile": (() => {
        const opacity = isOpenFileNodeNull ? 0 : 1;

        return {
            opacity,
            "transition": opacity === 0 ? undefined : "opacity 500ms linear",
        };
    })(),
    "breadcrump": {
        "marginTop": theme.spacing(3),
        "marginBottom": theme.spacing(4),
    },
    "fileOrDirectoryIcon": {
        "height": "unset",
        "width": "100%",
    },
}));

function useApiLogsBarPositioning() {
    const {
        domRect: { bottom: rootBottom },
        ref: rootRef,
    } = useDomRect();

    // NOTE: To avoid https://reactjs.org/docs/hooks-reference.html#useimperativehandle
    const {
        domRect: { height: buttonBarHeight, bottom: buttonBarBottom },
        ref: buttonBarRef,
    } = useDomRect();

    const [apiLogBarTop, setApiLogBarTop] = useState<number>(0);

    const [apiLogBarMaxHeight, setApiLogBarMaxHeight] = useState<number>(0);

    useEffect(() => {
        setApiLogBarTop(buttonBarHeight);

        setApiLogBarMaxHeight(rootBottom - buttonBarBottom - 30);
    }, [buttonBarHeight, buttonBarBottom, rootBottom]);

    return {
        rootRef,
        buttonBarRef,
        apiLogBarTop,
        apiLogBarMaxHeight,
    };
}

type CreateS3DirectoryDialogProps = {
    state:
        | {
              directories: string[];
              resolveBasename: (basename: string) => void;
          }
        | undefined;
    onClose: () => void;
};

const { CreateS3DirectoryDialog } = (() => {
    const CreateS3DirectoryDialog = memo((props: CreateS3DirectoryDialogProps) => {
        const { state, onClose } = props;

        const evtResolve = useConst(() =>
            Evt.create<UnpackEvt<ButtonsProps["evtResolve"]>>(null),
        );

        const onResolveFunctionChanged = useConstCallback<
            BodyProps["onResolveFunctionChanged"]
        >(({ resolve }) => (evtResolve.state = resolve));

        const { t } = useTranslation({ Explorer });

        return (
            <Dialog
                title={t("new directory")}
                body={
                    state && (
                        <Body
                            onClose={onClose}
                            onResolveFunctionChanged={onResolveFunctionChanged}
                            {...state}
                        />
                    )
                }
                isOpen={state !== undefined}
                onClose={onClose}
                buttons={<Buttons evtResolve={evtResolve} onClose={onClose} />}
            />
        );
    });

    type BodyProps = {
        directories: string[];
        onClose: CreateS3DirectoryDialogProps["onClose"];
        resolveBasename: (basename: string) => void;
        onResolveFunctionChanged: (params: { resolve: (() => void) | null }) => void;
    };

    const Body = memo((props: BodyProps) => {
        const { directories, onClose, resolveBasename, onResolveFunctionChanged } = props;

        const { classes } = useStyles();

        const { t } = useTranslation({ Explorer });

        const getIsValidValue = useConstCallback<TextFieldProps["getIsValidValue"]>(
            text => {
                if (text === "") {
                    return {
                        "isValidValue": false,
                        "message": t("can't be empty"),
                    };
                }

                if (directories.includes(text)) {
                    return {
                        "isValidValue": false,
                        "message": t("already a directory with this name"),
                    };
                }

                return {
                    "isValidValue": true,
                };
            },
        );

        const [{ resolve }, setResolve] = useState<{ resolve: (() => void) | null }>({
            "resolve": null,
        });

        const onValueBeingTypedChange = useConstCallback<
            TextFieldProps["onValueBeingTypedChange"]
        >(({ value, isValidValue }) =>
            setResolve({
                "resolve": isValidValue
                    ? () => {
                          resolveBasename(value);
                          onClose();
                      }
                    : null,
            }),
        );

        useEffect(() => {
            onResolveFunctionChanged({ resolve });
        }, [resolve]);

        const suggestedBasename = useMemo(
            () =>
                generateUniqDefaultName({
                    "names": directories,
                    "buildName": buildNameFactory({
                        "defaultName": t("untitled what", {
                            "what": t("directory"),
                        }),
                        "separator": "_",
                    }),
                }),
            [directories, t],
        );

        const evtAction = useConst(() =>
            Evt.create<UnpackEvt<NonNullable<TextFieldProps["evtAction"]>>>(),
        );

        const onEnterKeyDown = useConstCallback<TextFieldProps["onEnterKeyDown"]>(
            ({ preventDefaultAndStopPropagation }) => {
                preventDefaultAndStopPropagation();
                evtAction.post("TRIGGER SUBMIT");
            },
        );

        const onSubmit = useConstCallback<TextFieldProps["onSubmit"]>(() => {
            assert(resolve !== null);
            resolve();
        });

        return (
            <TextField
                inputProps_autoFocus={true}
                selectAllTextOnFocus={true}
                className={classes.textField}
                defaultValue={suggestedBasename}
                getIsValidValue={getIsValidValue}
                onValueBeingTypedChange={onValueBeingTypedChange}
                doOnlyValidateInputAfterFistFocusLost={false}
                evtAction={evtAction}
                onEnterKeyDown={onEnterKeyDown}
                onSubmit={onSubmit}
            />
        );
    });

    type ButtonsProps = {
        onClose: CreateS3DirectoryDialogProps["onClose"];
        evtResolve: StatefulReadonlyEvt<(() => void) | null>;
    };

    const Buttons = memo((props: ButtonsProps) => {
        const { onClose, evtResolve } = props;

        const { t } = useTranslation({ Explorer });

        useRerenderOnStateChange(evtResolve);

        return (
            <>
                <Button variant="secondary" onClick={onClose}>
                    {t("cancel")}
                </Button>
                <Button
                    onClick={evtResolve.state ?? undefined}
                    disabled={evtResolve.state === null}
                >
                    {t("create")}
                </Button>
            </>
        );
    });

    const useStyles = makeStyles({ "name": { CreateS3DirectoryDialog } })(theme => ({
        "textField": {
            "width": 250,
            "margin": theme.spacing(5),
        },
    }));

    return { CreateS3DirectoryDialog };
})();
