import { DOMUtils } from './utils/DOMUtils.js';

import './ui/UI.js';

import { StatusBar } from './ui/StatusBar/StatusBar.js';

import { LoaderFactory } from './loaders/LoaderFactory.js';
import { ReaderFactory } from './readers/ReaderFactory.js';

import { MainDialog } from './dialogs/MainDialog/MainDialog.js';
import { VolumeLoadDialog } from './dialogs/VolumeLoadDialog/VolumeLoadDialog.js';
import { EnvmapLoadDialog } from './dialogs/EnvmapLoadDialog/EnvmapLoadDialog.js';
import { RenderingContextDialog } from './dialogs/RenderingContextDialog/RenderingContextDialog.js';

import { RenderingContext } from './RenderingContext.js';

export class Application {

constructor() {
    this._handleFileDrop = this._handleFileDrop.bind(this);
    this._handleRendererChange = this._handleRendererChange.bind(this);
    this._handleToneMapperChange = this._handleToneMapperChange.bind(this);
    this._handleVolumeLoad = this._handleVolumeLoad.bind(this);
    this._handleEnvmapLoad = this._handleEnvmapLoad.bind(this);

    this.binds = DOMUtils.bind(document.body);

    this.renderingContext = new RenderingContext();
    this.binds.container.appendChild(this.renderingContext.getCanvas());

    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', this._handleFileDrop);

    this.mainDialog = new MainDialog();

    this.statusBar = new StatusBar();
    document.body.appendChild(this.statusBar);

    this.volumeLoadDialog = new VolumeLoadDialog();
    this.mainDialog.getVolumeLoadContainer().appendChild(this.volumeLoadDialog.object);
    this.volumeLoadDialog.addEventListener('load', this._handleVolumeLoad);

    this.envmapLoadDialog = new EnvmapLoadDialog();
    this.mainDialog.getEnvmapLoadContainer().appendChild(this.envmapLoadDialog.object);
    this.envmapLoadDialog.addEventListener('load', this._handleEnvmapLoad);

    this.renderingContextDialog = new RenderingContextDialog();
    this.mainDialog.getRenderingContextSettingsContainer().appendChild(
            this.renderingContextDialog.object);
    this.renderingContextDialog.addEventListener('resolution', e => {
        const resolution = this.renderingContextDialog.resolution;
        this.renderingContext.setResolution(resolution);
    });
    this.renderingContextDialog.addEventListener('transformation', e => {
        const s = this.renderingContextDialog.scale;
        const t = this.renderingContextDialog.translation;
        this.renderingContext.setScale(...s);
        this.renderingContext.setTranslation(...t);
    });
    this.renderingContextDialog.addEventListener('filter', e => {
        const filter = this.renderingContextDialog.filter;
        this.renderingContext.setFilter(filter);
    });

    this.renderingContext.addEventListener('progress', e => {
        this.volumeLoadDialog.binds.loadProgress.value = e.detail;
    });

    this.mainDialog.addEventListener('rendererchange', this._handleRendererChange);
    this.mainDialog.addEventListener('tonemapperchange', this._handleToneMapperChange);
    this._handleRendererChange();
    this._handleToneMapperChange();
}

_handleFileDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length === 0) {
        return;
    }
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.bvp')) {
        throw new Error('Filename extension must be .bvp');
    }
    this._handleVolumeLoad(new CustomEvent('load', {
        detail: {
            type       : 'file',
            file       : file,
            filetype   : 'bvp',
            dimensions : { x: 0, y: 0, z: 0 }, // doesn't matter
            precision  : 8, // doesn't matter
        }
    }));
}

_constructDialogFromProperties(object) {
    const panel = document.createElement('div');
    for (const property of object.properties) {
        const widget = this.createUIFromProperty(property);
        const field = `<ui-field><label slot="label">${property.label}</label>${widget}</ui-field>`;
        const instance = DOMUtils.instantiate(field);
        panel.appendChild(instance);
    }
    return panel;
}

createUIFromProperty(property) {
    switch (property.type) {
        case 'spinner': return `<input type="number" bind="${property.name}" value="${property.value}" min="${property.min}" max="${property.max}" step="${property.step}">`;
        case 'slider': return `<ui-slider bind="${property.name}" value="${property.value}" min="${property.min}" max="${property.max}" step="${property.step}"></ui-slider>`;
        case 'transfer-function': return `<ui-accordion><ui-transfer-function bind="${property.name}"></ui-transfer-function></ui-accordion>`;
        default: return `<div></div>`;
    }
}

_handleRendererChange() {
    const which = this.mainDialog.getSelectedRenderer();
    this.renderingContext.chooseRenderer(which);
    const renderer = this.renderingContext.getRenderer();
    const object = this._constructDialogFromProperties(renderer);
    console.log(object);
    const binds = DOMUtils.bind(object);
    this.rendererDialog = object;
    for (const name in binds) {
        binds[name].addEventListener('change', e => {
            const value = binds[name].value;
            renderer[name] = value;
            renderer.dispatchEvent(new CustomEvent('change', {
                detail: { name, value }
            }));
        });
    }
    const container = this.mainDialog.getRendererSettingsContainer();
    container.appendChild(this.rendererDialog);
}

_handleToneMapperChange() {
    const which = this.mainDialog.getSelectedToneMapper();
    this.renderingContext.chooseToneMapper(which);
    const toneMapper = this.renderingContext.getToneMapper();
    const object = this._constructDialogFromProperties(toneMapper);
    const binds = DOMUtils.bind(object);
    this.toneMapperDialog = object;
    for (const name in binds) {
        binds[name].addEventListener('change', e => {
            const value = binds[name].value;
            toneMapper[name] = value;
            toneMapper.dispatchEvent(new CustomEvent('change', {
                detail: { name, value }
            }));
        });
    }
    const container = this.mainDialog.getToneMapperSettingsContainer();
    container.appendChild(this.toneMapperDialog);
}

_handleVolumeLoad(e) {
    const options = e.detail;
    if (options.type === 'file') {
        const readerClass = ReaderFactory(options.filetype);
        if (readerClass) {
            const loaderClass = LoaderFactory('blob');
            const loader = new loaderClass(options.file);
            const reader = new readerClass(loader, {
                width  : options.dimensions[0],
                height : options.dimensions[1],
                depth  : options.dimensions[2],
                bits   : options.precision,
            });
            this.renderingContext.stopRendering();
            this.renderingContext.setVolume(reader);
        }
    } else if (options.type === 'url') {
        const readerClass = ReaderFactory(options.filetype);
        if (readerClass) {
            const loaderClass = LoaderFactory('ajax');
            const loader = new loaderClass(options.url);
            const reader = new readerClass(loader);
            this.renderingContext.stopRendering();
            this.renderingContext.setVolume(reader);
        }
    }
}

_handleEnvmapLoad(e) {
    const options = e.detail;
    let image = new Image();
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => {
        this.renderingContext.setEnvironmentMap(image);
        this.renderingContext.getRenderer().reset();
    });

    if (options.type === 'file') {
        let reader = new FileReader();
        reader.addEventListener('load', () => {
            image.src = reader.result;
        });
        reader.readAsDataURL(options.file);
    } else if (options.type === 'url') {
        image.src = options.url;
    }
}

}
