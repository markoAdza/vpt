export class QuadTreeNode {
    constructor(x, y, width, height, depth) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.density = 0;
        this.children = [];
    }

    isLeaf() {
        return this.children.length === 0;
    }

    subdivide() {
        if (this.depth > 0) {
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            const depth = this.depth - 1;

            this.children.push(new QuadTreeNode(this.x, this.y, halfWidth, halfHeight, depth));
            this.children.push(new QuadTreeNode(this.x + halfWidth, this.y, halfWidth, halfHeight, depth));
            this.children.push(new QuadTreeNode(this.x, this.y + halfHeight, halfWidth, halfHeight, depth));
            this.children.push(new QuadTreeNode(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight, depth));

            for (let child of this.children) {
                child.subdivide();
            }
        }
    }
}

export class QuadTree {
    constructor(imageData, width, height, maxDepth) {
        this.imageData = imageData;
        this.width = width;
        this.height = height;
        this.maxDepth = maxDepth;
        this.root = new QuadTreeNode(0, 0, width, height, maxDepth);

        this.buildTree(this.root);
        this.calculateDensities(this.root);
    }

    buildTree(node) {
        if (node.depth > 0) {
            node.subdivide();
            for (let child of node.children) {
                this.buildTree(child);
            }
        }
    }

    calculateDensities(node) {
        if (node.isLeaf()) {
            node.density = this.calculateDensity(node);
        } else {
            node.density = 0;
            for (let child of node.children) {
                this.calculateDensities(child);
                node.density += child.density;
            }
        }
    }

    calculateDensity(node) {
        let sum = 0;
        for (let i = node.y; i < node.y + node.height; i++) {
            for (let j = node.x; j < node.x + node.width; j++) {
                const index = (i * this.width + j) * 4; // Assuming imageData is in RGBA format
                const intensity = this.imageData[index]; // Using red channel for intensity
                sum += intensity;
            }
        }
        return sum / (node.width * node.height);
    }

    getMostDenseRegion() {
        return this.traverseAndFind(this.root, (a, b) => a.density > b.density);
    }

    getLeastDenseRegion() {
        return this.traverseAndFind(this.root, (a, b) => a.density < b.density);
    }

    traverseAndFind(node, comparator) {
        if (node.isLeaf()) {
            return node;
        }

        let bestChild = node.children[0];
        for (let child of node.children) {
            const candidate = this.traverseAndFind(child, comparator);
            if (comparator(candidate, bestChild)) {
                bestChild = candidate;
            }
        }
        return bestChild;
    }
}
