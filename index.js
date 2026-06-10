// ================= IMPORTS =================

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const express = require('express');
const mongoose = require('mongoose');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const Tesseract = require('tesseract.js');

// ================= EXPRESS =================

const app = express();

app.get('/', (req, res) => {
    res.send('Hells Legion Inventory Online');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Web server lancé.');
});

// ================= CONFIG =================

const config = {

    token: process.env.TOKEN,
    mongoUri: process.env.MONGO_URI,

    clientId: '1507287568440627261',
    guildId: '1478420890051018765',

    logChannelName: '📦・│log-stockage'

};

// ================= CLIENT =================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= CONNECTION EVENTS =================

client.on('disconnect', () => {
    console.log('❌ Bot déconnecté.');
});

client.on('reconnecting', () => {
    console.log('🔄 Reconnexion...');
});

client.on('resume', () => {
    console.log('✅ Session reprise.');
});

client.on('error', console.error);
client.on('warn', console.warn);

// ================= MONGODB =================

mongoose.connect(config.mongoUri)
.then(() => {
    console.log('✅ MongoDB connecté.');
})
.catch(console.error);

// ================= SCHEMA =================

const stockSchema = new mongoose.Schema({

    item: {
        type: String,
        required: true,
        unique: true
    },

    quantity: {
        type: Number,
        required: true
    },

    category: {
        type: String,
        required: true
    }

});

const Stock = mongoose.model('Stock', stockSchema);

// ================= CATEGORIES =================

const categories = {

    ressources: '🔨 Ressources',
	ressources_rares: '💎 Ressources rares',
	rack: '🗄️ Rack',
    medical: '💊 Médical',
	hazmat: '☣️ Hazmat',
    armurerie: '🔫 Armurerie',
	munitions: '💥 Munitions',
    vehicules: '🚗 Véhicules',
    nourriture: '🍔 Nourriture',
    divers: '📦 Divers'

};

const categoryOrder = [
    'ressources',
    'ressources_rares',
    'rack',
    'medical',
    'hazmat',
    'armurerie',
	'munitions',
    'vehicules',
    'nourriture',
    'divers'
];

// ================= ITEM EMOJIS =================

function getItemEmoji(itemName) {

    const name = itemName.toLowerCase();

    if (name.includes('Bois')) return '🪵';
    if (name.includes('Pierre')) return '🪨';
    if (name.includes('Charbon')) return '⚫';
    if (name.includes('Fer')) return '⛓️';
    if (name.includes('Ferraille')) return '🔩';
    if (name.includes('Eau')) return '💧';
    if (name.includes('Bandage')) return '🩹';
    if (name.includes('Medkit')) return '💉';
    if (name.includes('Essence')) return '⛽';
    if (name.includes('munition')) return '🔸';
    if (name.includes('burger')) return '🍔';
    if (name.includes('Pain')) return '🥖';
    if (name.includes('voiture')) return '🚗';
    if (name.includes('camion')) return '🚚';
    if (name.includes('arme')) return '🔫';

    return '📦';
}

	const slots = [


// ===== LIGNE 1 =====

	{ x: 0, y: 0 },
	{ x: 119, y: 0 },
	{ x: 238, y: 0 },
	{ x: 357, y: 0 },
	{ x: 476, y: 0 },

// ===== LIGNE 2 =====

	{ x: 0, y: 111 },
	{ x: 119, y: 111 },
	{ x: 238, y: 111 },
	{ x: 357, y: 111 },
	{ x: 476, y: 111 },

// ===== LIGNE 3 =====

	{ x: 0, y: 222 },
	{ x: 119, y: 222 },
	{ x: 238, y: 222 },
	{ x: 357, y: 222 },
	{ x: 476, y: 222 }


];


// ================= TEMP STORAGE =================

const pendingAdds = new Map();
const pendingCategoryAdds = new Map();
const pendingItemAdds = new Map();
const pendingCategoryRemoves = new Map();
const pendingItemRemoves = new Map();
const pendingNewItems = new Map();

async function detectQuantity(imagePath) {

    const result =
        await Tesseract.recognize(
            imagePath,
            'eng'
        );

    const text =
        result.data.text;

    const match =
        text.match(/(\d+)/);

    return match
        ? Number(match[1])
        : 0;
}

async function detectText(imagePath) {


const result =
    await Tesseract.recognize(
        imagePath,
        'fra'
    );

return result.data.text
    .replace(/\n/g, ' ')
    .trim();


}


// ================= SAFE FUNCTIONS =================

async function safeReply(interaction, data) {

    try {

        if (interaction.deferred || interaction.replied) {
            return await interaction.followUp(data).catch(() => {});
        }

        return await interaction.reply(data).catch(() => {});

    } catch (err) {
        console.error(err);
    }
}

async function safeUpdate(interaction, data) {

    try {

        if (!interaction.replied && !interaction.deferred) {
            return await interaction.update(data).catch(() => {});
        }

    } catch (err) {
        console.error(err);
    }
}

// ================= COMMANDES =================

const commands = [

    new SlashCommandBuilder()
        .setName('inventaire')
        .setDescription('Ouvrir le panel inventaire'),
		
	new SlashCommandBuilder()
		.setName('scanstock')
		.setDescription('Scanner un inventaire')
		.addAttachmentOption(option =>
        option
            .setName('image')
            .setDescription('Capture écran')
            .setRequired(true)
    ),

].map(command => command.toJSON());

// ================= REGISTER =================

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                config.clientId,
                config.guildId
            ),
            { body: commands }
        );

        console.log('✅ Commandes enregistrées.');

    } catch (err) {
        console.error(err);
    }

})();

// ================= READY =================

client.once('clientReady', () => {
    console.log(`✅ ${client.user.tag} connecté.`);
});

// ================= EMBED =================

async function createMainEmbed() {

    const totalItems = await Stock.countDocuments();

    const totalQuantityResult = await Stock.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: '$quantity' }
            }
        }
    ]);

    const totalQuantity = totalQuantityResult[0]?.total || 0;

    return new EmbedBuilder()
        .setTitle('📦 HELLS LEGION • INVENTAIRE')
        .setDescription(`
Bienvenue dans le système de stockage.

🔨 Ressources
💎 Ressources rares
🗄️ Rack
💊 Médical
☣️ Hazmat
🔫 Armurerie
💥 Munitions
🚗 Véhicules
🍔 Nourriture
📦 Divers
`)
        .addFields({
            name: '📊 Statistiques',
            value:
`📦 Items : ${totalItems}
📈 Quantité totale : ${totalQuantity}`
        })
        .setColor('#8B0000')
        .setFooter({
            text: 'Inventaire by Aykishu'
        });
}

// ================= BUTTONS =================

function createButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('view_stock')
                    .setEmoji('📦')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('refresh_stock')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('add_stock')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('remove_stock')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Danger)

            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('new_item')
                    .setEmoji('🆕')
                    .setLabel('Nouvel objet')
                    .setStyle(ButtonStyle.Secondary)

            )

    ];

}

// ================= CATEGORY MENU =================

function createCategoryMenu(customId = 'category_select') {

    return new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
                .setCustomId(customId)
                .setPlaceholder('📂 Choisir une catégorie')
                .addOptions([

                    {
                        label: 'Ressources',
                        value: 'ressources',
                        emoji: '🔨'
                    },

                    {
                        label: '💎 Ressources rares',
                        value: 'ressources_rares',
                        emoji: '💎'
                    },

                    {
                        label: 'Rack',
                        value: 'rack',
                        emoji: '🗄️'
                    },

                    {
                        label: 'Médical',
                        value: 'medical',
                        emoji: '💊'
                    },
					
                    {
                        label: 'Hazmat',
                        value: 'hazmat',
                        emoji: '☣️'
                    },
					
                    {
                        label: 'Armurerie',
                        value: 'armurerie',
                        emoji: '🔫'
                    },

                    {
                        label: 'Munitions',
                        value: 'munitions',
                        emoji: '💥'
                    },

                    {
                        label: 'Mécanique',
                        value: 'vehicules',
                        emoji: '🚗'
                    },

                    {
                        label: 'Nourriture',
                        value: 'nourriture',
                        emoji: '🍔'
                    },

                    {
                        label: 'Divers',
                        value: 'divers',
                        emoji: '📦'
                    }

                ])

        );

}

// ================= LOG FUNCTION =================

async function sendLog(interaction, embed) {

    try {

        const logChannel = interaction.guild.channels.cache.find(
            c => c.name === config.logChannelName
        );

        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }

    } catch (err) {
        console.error(err);
    }
}

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

    try {

        // ================= SLASH COMMAND =================

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'inventaire') {

                const embed = await createMainEmbed();

                return safeReply(interaction, {
                    embeds: [embed],
                    components: [
                        ...createButtons(),
                    ]
                });
            }
			
			if (interaction.commandName === 'scanstock') {
				
				const attachment =
    interaction.options.getAttachment('image');

await interaction.deferReply({
    flags: 64
});

const response =
    await axios.get(
        attachment.url,
        {
            responseType: 'arraybuffer'
        }
    );

fs.writeFileSync(
    './inventory.png',
    response.data
);

const results = [];

let index = 0;

for (const slot of slots) {

    const slotFile =
        `./slot_${index}.png`;

    // découpe slot

    await sharp('./inventory.png')
        .extract({
            left: slot.x,
            top: slot.y,
            width: 118,
            height: 110
        })
        .toFile(slotFile);
		console.log(`SLOT ${index} SAVED`);

// découpe texte item

	const textFile =
		`./text_${index}.png`;


	await sharp(slotFile)
		.extract({
		left: 0,
		top: 82,
		width: 110,
		height: 35
})
.toFile(textFile);

// OCR texte

	const rawText =
	
	await detectText(textFile);

	const item = rawText
		.toLowerCase()
		.replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '')
		.trim();
		
	console.log('ITEM OCR:', item);

    // découpe quantité

	const quantityFile =
		`./qty_${index}.png`;


    await sharp(slotFile)
		.extract({
		left: 72,
		top: 2,
		width: 42,
		height: 20
})
		.resize(300, 120)
		.grayscale()
		.normalize()
		.sharpen()
		.toFile(quantityFile);


    const quantity =
        await detectQuantity(
            quantityFile
        );

	console.log('QUANTITY OCR:', quantity);

    // skip slot vide

    if (!item || quantity <= 0) {

        index++;
        continue;
    }

    // update mongodb

    await Stock.findOneAndUpdate(
        {
            item: item
        },
        {
            quantity: quantity
        },
        {
            upsert: true
        }
    );

    results.push(
        `📦 ${item} → ${quantity}`
    );

    index++;
}

await interaction.editReply({
    content:
`✅ Scan terminé

${results.join('\n')}`
});
}
        }

        // ================= BUTTONS =================

        if (interaction.isButton()) {

            // VIEW STOCK

            if (interaction.customId === 'view_stock') {

				const rows = await Stock.find();

rows.sort((a, b) => {

    const categoryA = categoryOrder.indexOf(a.category);
    const categoryB = categoryOrder.indexOf(b.category);

    if (categoryA !== categoryB) {
        return categoryA - categoryB;
    }

    return a.item.localeCompare(b.item);
});

                if (rows.length === 0) {
                    return safeReply(interaction, {
                        content: '📦 Aucun stock enregistré.',
                        flags: 64
                    });
                }

  // ================= REGROUPEMENT PAR CATÉGORIE =================

const grouped = {};

rows.forEach(row => {

    if (!grouped[row.category]) {
        grouped[row.category] = [];
    }

    grouped[row.category].push(row);

});

// ================= DESCRIPTION =================

let description = '';

for (const category in grouped) {

    description += `\n━━━━━━━━━━━━━━\n`;
    description += `${categories[category].toUpperCase()}\n`;
    description += `━━━━━━━━━━━━━━\n`;

    grouped[category].forEach(item => {

        description += `└ 📦 ${item.item} : **${item.quantity}**\n`;

    });

    description += '\n';
}

                const embed = new EmbedBuilder()
                    .setTitle('📦 STOCK COMPLET')
                    .setDescription(description)
                    .setColor('#8B0000');

                return safeReply(interaction, {
                    embeds: [embed],
                    flags: 64
                });
            }

            // REFRESH

            if (interaction.customId === 'refresh_stock') {

                const embed = await createMainEmbed();

                return safeUpdate(interaction, {
                    embeds: [embed],
                    components: [
                        ...createButtons(),
                    ]
                });
            }

            // ADD

            if (interaction.customId === 'add_stock') {

    return safeReply(interaction, {
        content: '📂 Choisis une catégorie :',
        components: [
            createCategoryMenu('add_category_select')
        ],
        flags: 64
    });
}

// NEW ITEM

if (interaction.customId === 'new_item') {

    return safeReply(interaction, {
        content: '📂 Choisis une catégorie :',
        components: [
            createCategoryMenu('new_item_category_select')
        ],
        flags: 64
    });
}

            // REMOVE

            if (interaction.customId === 'remove_stock') {

    return safeReply(interaction, {
        content: '📂 Choisis une catégorie :',
        components: [
            createCategoryMenu('remove_category_select')
        ],
        flags: 64
    });
}

            // DELETE

            if (interaction.customId === 'delete_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('delete_stock_modal')
                    .setTitle('🗑️ Supprimer un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput)
                );

                return interaction.showModal(modal);
            }

             // SEARCH

            if (interaction.customId === 'search_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('search_stock_modal')
                    .setTitle('🔍 Rechercher un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput)
                );

                return interaction.showModal(modal);
            }
        }

        // ================= MODALS =================

        if (interaction.isModalSubmit()) {
            
// ================= NEW ITEM MODAL =================

	if (interaction.customId === 'new_item_modal') {

    const itemName = interaction.fields.getTextInputValue('item');

    const category = pendingNewItems.get(
    interaction.user.id
);

    if (!category) {

        return safeReply(interaction, {
            content: '❌ Catégorie introuvable.',
            flags: 64
        });
    }

    const exists = await Stock.findOne({
        item: itemName
    });

    if (exists) {

        return safeReply(interaction, {
            content: '❌ Cet objet existe déjà.',
            flags: 64
        });
    }

    await Stock.create({
        item: itemName,
        quantity: 0,
        category
    });

    pendingNewItems.delete(
    interaction.user.id
);

    await safeReply(interaction, {
        content: `✅ Objet créé : **${itemName}**`,
        flags: 64
    });

    const embed = new EmbedBuilder()
        .setTitle('🆕 NOUVEL OBJET')
        .setDescription(`
👤 Membre : ${interaction.user}

📦 Objet : **${itemName}**
📂 Catégorie : **${categories[category]}**
`)
        .setColor('Blue');

    sendLog(interaction, embed);
}
			
// ================= REMOVE STOCK QUANTITY =================

if (interaction.customId === 'remove_stock_quantity_modal') {

	const raison =
    interaction.fields.getTextInputValue('raison') || 'Non renseignée';

    const quantite = Number(
        interaction.fields.getTextInputValue('quantite')
    );

    if (isNaN(quantite) || quantite <= 0) {

        return safeReply(interaction, {
            content: '❌ Quantité invalide.',
            flags: 64
        });
    }

    const category = pendingCategoryRemoves.get(interaction.user.id);
    const objet = pendingItemRemoves.get(interaction.user.id);

    if (!category || !objet) {

        return safeReply(interaction, {
            content: '❌ Données expirées.',
            flags: 64
        });
    }

    let item = await Stock.findOne({
        item: objet
    });

    if (!item) {

        return safeReply(interaction, {
            content: '❌ Objet introuvable.',
            flags: 64
        });
    }

    if (item.quantity < quantite) {

        return safeReply(interaction, {
            content: '❌ Stock insuffisant.',
            flags: 64
        });
    }

    item.quantity -= quantite;

    await item.save();

    pendingCategoryRemoves.delete(interaction.user.id);
    pendingItemRemoves.delete(interaction.user.id);

    await safeReply(interaction, {
        content: '✅ Stock retiré.',
        flags: 64
    });

    const embed = new EmbedBuilder()
        .setTitle('📤 STOCK RETIRÉ')
        .setDescription(`
👤 Membre : ${interaction.user}

📦 Item : **${objet}**
➖ Quantité retirée : **${quantite}**
📂 Catégorie : **${categories[category]}**
📝 Raison : **${raison}**
📉 Stock restant : **${item.quantity}**
`)
        .setColor('Red');

    sendLog(interaction, embed);
}

            // DELETE STOCK

            if (interaction.customId === 'delete_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const item = await Stock.findOne({
                    item: objet
                });

                if (!item) {

                    return safeReply(interaction, {
                        content: '❌ Item introuvable.',
                        flags: 64
                    });
                }

                await Stock.deleteOne({
                    item: objet
                });

                await safeReply(interaction, {
                    content: '✅ Item supprimé.',
                    flags: 64
                });

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ ITEM SUPPRIMÉ')
                    .setDescription(`
👤 Membre : ${interaction.user}

📦 Item supprimé : **${objet}**
`)
                    .setColor('DarkRed');

                sendLog(interaction, embed);
            }

            // SEARCH STOCK

            if (interaction.customId === 'search_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const item = await Stock.findOne({
                    item: {
                        $regex: objet,
                        $options: 'i'
                    }
                });

                if (!item) {

                    return safeReply(interaction, {
                        content: '❌ Aucun item trouvé.',
                        flags: 64
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🔍 ITEM TROUVÉ')
                    .setDescription(`
📦 Item : **${item.item}**
📊 Quantité : **${item.quantity}**
📂 Catégorie : **${categories[item.category]}**
`)
                    .setColor('Blue');

                return safeReply(interaction, {
                    embeds: [embed],
                    flags: 64
                });
            }
// ================= ADD STOCK QUANTITY =================

if (interaction.customId === 'add_stock_quantity_modal') {

	const raison =
    interaction.fields.getTextInputValue('raison') || 'Non renseignée';
	
    const quantite = Number(
        interaction.fields.getTextInputValue('quantite')
    );

    if (isNaN(quantite) || quantite <= 0) {

        return safeReply(interaction, {
            content: '❌ Quantité invalide.',
            flags: 64
        });
    }

    const category = pendingCategoryAdds.get(interaction.user.id);
    const objet = pendingItemAdds.get(interaction.user.id);

    if (!category || !objet) {

        return safeReply(interaction, {
            content: '❌ Données expirées.',
            flags: 64
        });
    }

    let item = await Stock.findOne({
        item: objet
    });

    if (!item) {

        return safeReply(interaction, {
            content: '❌ Objet introuvable.',
            flags: 64
        });
    }

    item.quantity += quantite;

    await item.save();

    pendingCategoryAdds.delete(interaction.user.id);
    pendingItemAdds.delete(interaction.user.id);

    await safeReply(interaction, {
        content: '✅ Stock ajouté.',
        flags: 64
    });

    const embed = new EmbedBuilder()
        .setTitle('📥 STOCK AJOUTÉ')
        .setDescription(`
👤 Membre : ${interaction.user}

📦 Item : **${objet}**
➕ Quantité : **${quantite}**
📂 Catégorie : **${categories[category]}**
📝 Raison : **${raison}**
📈 Stock restant : **${item.quantity}**
`)
        .setColor('Green');

    sendLog(interaction, embed);
}
			
        }

        // ================= SELECT MENUS =================

        if (interaction.isStringSelectMenu()) {

            // VIEW CATEGORY

            if (interaction.customId === 'category_select') {

                const category = interaction.values[0];

                const rows = await Stock.find({
                    category
                }).sort({
                    item: 1
                });

                let description = '';

                if (rows.length === 0) {

                    description = '📦 Aucun item dans cette catégorie.';

                } else {

                    rows.forEach(row => {

                        description += `
📦 **${row.item}**
└ Quantité : ${row.quantity}

`;
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle(categories[category])
                    .setDescription(description)
                    .setColor('#8B0000');

                return safeReply(interaction, {
                    embeds: [embed],
                    flags: 64
                });
            }

// ================= NEW ITEM CATEGORY =================

if (interaction.customId === 'new_item_category_select') {

    const category = interaction.values[0];

    pendingNewItems.set(
        interaction.user.id,
        category
    );

    const modal = new ModalBuilder()
        .setCustomId('new_item_modal')
        .setTitle('🆕 Nouvel objet');

    const itemInput = new TextInputBuilder()
        .setCustomId('item')
        .setLabel('Nom de l’objet')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(itemInput)
    );

    return interaction.showModal(modal);
}

// ================= ADD CATEGORY SELECT =================

if (interaction.customId === 'add_category_select') {
	
    const category = interaction.values[0];

    pendingCategoryAdds.set(interaction.user.id, category);

    const items = await Stock.find({
        category
    }).sort({
        item: 1
    });

    if (items.length === 0) {

        return safeReply(interaction, {
            content: '❌ Aucun objet dans cette catégorie.',
            flags: 64
        });
    }

    const options = items.slice(0, 25).map(item => ({
        label: item.item,
        value: item.item,
        emoji: '📦'
    }));

    const menu = new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
                .setCustomId('add_item_select')
                .setPlaceholder('📦 Choisir un objet')
                .addOptions(options)

        );

    return safeReply(interaction, {
        content: '📦 Choisis un objet :',
        components: [menu],
        flags: 64
    });
}

// ================= ADD ITEM SELECT =================

if (interaction.customId === 'add_item_select') {

    const item = interaction.values[0];

    pendingItemAdds.set(interaction.user.id, item);

    const modal = new ModalBuilder()
        .setCustomId('add_stock_quantity_modal')
        .setTitle('➕ Ajouter du stock');

    const quantityInput = new TextInputBuilder()
        .setCustomId('quantite')
        .setLabel('Quantité')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

	const reasonInput = new TextInputBuilder()
		.setCustomId('raison')
		.setLabel('Raison (facultatif)')
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

    modal.addComponents(
		new ActionRowBuilder().addComponents(quantityInput),
		new ActionRowBuilder().addComponents(reasonInput)
	);

    return interaction.showModal(modal);
}

// ================= REMOVE CATEGORY SELECT =================

if (interaction.customId === 'remove_category_select') {

    const category = interaction.values[0];

    pendingCategoryRemoves.set(interaction.user.id, category);

    const items = await Stock.find({
        category
    }).sort({
        item: 1
    });

    if (items.length === 0) {

        return safeReply(interaction, {
            content: '❌ Aucun objet dans cette catégorie.',
            flags: 64
        });
    }

    const options = items.slice(0, 25).map(item => ({
        label: item.item,
        value: item.item,
        emoji: '📦'
    }));

    const menu = new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
                .setCustomId('remove_item_select')
                .setPlaceholder('📦 Choisir un objet')
                .addOptions(options)

        );

    return safeReply(interaction, {
        content: '📦 Choisis un objet :',
        components: [menu],
        flags: 64
    });
}

// ================= REMOVE ITEM SELECT =================

if (interaction.customId === 'remove_item_select') {

    const item = interaction.values[0];

    pendingItemRemoves.set(interaction.user.id, item);

    const modal = new ModalBuilder()
        .setCustomId('remove_stock_quantity_modal')
        .setTitle('📤 Retirer du stock');

    const quantityInput = new TextInputBuilder()
        .setCustomId('quantite')
        .setLabel('Quantité')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

	const reasonInput = new TextInputBuilder()
		.setCustomId('raison')
		.setLabel('Raison (facultatif)')
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

    modal.addComponents(
		new ActionRowBuilder().addComponents(quantityInput),
		new ActionRowBuilder().addComponents(reasonInput)
	);

    return await interaction.showModal(modal);
}

        }

    } catch (err) {
        console.error(err);
    }

});


// ================= ERROR HANDLERS =================

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= AUTO RECONNECT =================

client.on('disconnect', async () => {

    console.log('⚠️ Déconnexion détectée.');

    try {

        await client.destroy();

    } catch {}

    setTimeout(async () => {

        try {

            await client.login(config.token);

            console.log('✅ Reconnexion effectuée.');

        } catch (err) {

            console.error('❌ Erreur reconnexion :', err);

        }

    }, 5000);

});

// ================= LOGIN =================

client.login(config.token);