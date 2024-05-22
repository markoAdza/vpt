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

            // Define starting positions for each child
            const childXPositions = [this.x, this.x + halfWidth, this.x, this.x + halfWidth];
            const childYPositions = [this.y, this.y, this.y + halfHeight, this.y + halfHeight];

            for (let i = 0; i < 4; i++) {
                this.children.push(new QuadTreeNode(childXPositions[i], childYPositions[i], halfWidth, halfHeight, depth));
            }

            // Recursively subdivide each child node
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
        node.subdivide();
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
                const index = (i * this.width + j) * 4; 
                const intensity = this.imageData[index]; // Using red channel for intensity
                sum += intensity;
            }
        }
        return sum / (node.width * node.height);
    }

    getRegionsByDepth() {
        const result = [];

        function traverse(node, depth) {
            if (!result[depth]) {
                result[depth] = [];
            }
            result[depth].push({
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
                density: node.density,
                children: []
            });

            for (let child of node.children) {
                traverse(child, depth + 1);
            }
        }

        traverse(this.root, 0);
        return result;
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
