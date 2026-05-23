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

const app = express();

// ================= WEB SERVER =================

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

    clientId: "1507287568440627261",
    guildId: "1478420890051018765",

    logChannelName: "📦・│log-stockage"

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

    ressources: "🔨 Ressources",
    medical: "💊 Médical",
    armes: "🔫 Armurerie",
    vehicules: "🚗 Véhicules",
    nourriture: "🍔 Nourriture",
    divers: "📦 Divers"

};

// ================= TEMP STORAGE =================

const pendingAdds = new Map();

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
        .setDescription('Ouvrir le panel inventaire')

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

        console.log("✅ Commandes enregistrées.");

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
                total: { $sum: "$quantity" }
            }
        }
    ]);

    const totalQuantity = totalQuantityResult[0]?.total || 0;

    return new EmbedBuilder()
        .setTitle('📦 HELLS LEGION • INVENTAIRE')
        .setDescription(`
Bienvenue dans le système de stockage.

🔨 Ressources
💊 Médical
🔫 Armurerie
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
            text: 'Inventory System V17 MongoDB'
        });

}

// ================= BUTTONS =================

function createButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('view_stock')
                    .setLabel('Voir Stock')
                    .setEmoji('📦')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('refresh_stock')
                    .setLabel('Actualiser')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)

            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('add_stock')
                    .setLabel('Ajouter')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('remove_stock')
                    .setLabel('Retirer')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('delete_stock')
                    .setLabel('Supprimer')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('search_stock')
                    .setLabel('Rechercher')
                    .setEmoji('🔍')
                    .setStyle(ButtonStyle.Primary)

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
                        label: 'Médical',
                        value: 'medical',
                        emoji: '💊'
                    },
                    {
                        label: 'Armurerie',
                        value: 'armes',
                        emoji: '🔫'
                    },
                    {
                        label: 'Véhicules',
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

            await logChannel.send({
                embeds: [embed]
            });

        }

    } catch (err) {

        console.error(err);

    }

}

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

    try {

        // ================= SLASH =================

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'inventaire') {

                const embed = await createMainEmbed();

                return safeReply(interaction, {
                    embeds: [embed],
                    components: [
                        ...createButtons(),
                        createCategoryMenu()
                    ]
                });

            }

        }

        // ================= BUTTONS =================

        if (interaction.isButton()) {

            // VIEW STOCK

            if (interaction.customId === 'view_stock') {

                const rows = await Stock.find().sort({
                    category: 1,
                    item: 1
                });

                if (rows.length === 0) {

                    return safeReply(interaction, {
                        content: '📦 Aucun stock enregistré.',
                        flags: 64
                    });

                }

                let description = '';

                rows.forEach(row => {

                    description += `
${categories[row.category]} **${row.item}**
└ 📦 ${row.quantity}

`;

                });

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
                        createCategoryMenu()
                    ]
                });

            }

            // ADD

            if (interaction.customId === 'add_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('add_stock_modal')
                    .setTitle('📥 Ajouter un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const quantiteInput = new TextInputBuilder()
                    .setCustomId('quantite')
                    .setLabel('Quantité')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput),
                    new ActionRowBuilder().addComponents(quantiteInput)
                );

                return interaction.showModal(modal);

            }

            // REMOVE

            if (interaction.customId === 'remove_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('remove_stock_modal')
                    .setTitle('📤 Retirer un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const quantiteInput = new TextInputBuilder()
                    .setCustomId('quantite')
                    .setLabel('Quantité')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput),
                    new ActionRowBuilder().addComponents(quantiteInput)
                );

                return interaction.showModal(modal);

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

            // ADD

            if (interaction.customId === 'add_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const quantite = Number(
                    interaction.fields.getTextInputValue('quantite')
                );

                if (isNaN(quantite) || quantite <= 0) {

                    return safeReply(interaction, {
                        content: '❌ Quantité invalide.',
                        flags: 64
                    });

                }

                pendingAdds.set(interaction.user.id, {
                    objet,
                    quantite
                });

                return safeReply(interaction, {
                    content: '📂 Choisis une catégorie :',
                    components: [
                        createCategoryMenu('add_category_select')
                    ],
                    flags: 64
                });

            }

            // REMOVE

            if (interaction.customId === 'remove_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const quantite = Number(
                    interaction.fields.getTextInputValue('quantite')
                );

                const item = await Stock.findOne({
                    item: objet
                });

                if (!item) {

                    return safeReply(interaction, {
                        content: '❌ Item introuvable.',
                        flags: 64
                    });

                }

                item.quantity -= quantite;

                if (item.quantity < 0) {
                    item.quantity = 0;
                }

                await item.save();

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
📉 Stock restant : **${item.quantity}**
`)
                    .setColor('Red');

                sendLog(interaction, embed);

            }

            // DELETE

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

            // SEARCH

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

        }

        // ================= SELECT MENUS =================

        if (interaction.isStringSelectMenu()) {

            // CATEGORY VIEW

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

            // ADD CATEGORY

            if (interaction.customId === 'add_category_select') {

                const category = interaction.values[0];

                const pending = pendingAdds.get(interaction.user.id);

                if (!pending) {

                    return safeReply(interaction, {
                        content: '❌ Données expirées.',
                        flags: 64
                    });

                }

                let item = await Stock.findOne({
                    item: pending.objet
                });

                if (item) {

                    item.quantity += pending.quantite;
                    await item.save();

                } else {

                    await Stock.create({
                        item: pending.objet,
                        quantity: pending.quantite,
                        category
                    });

                }

                pendingAdds.delete(interaction.user.id);

                await safeUpdate(interaction, {
                    content: '✅ Stock ajouté.',
                    embeds: [],
                    components: []
                });

                const embed = new EmbedBuilder()
                    .setTitle('📥 STOCK AJOUTÉ')
                    .setDescription(`
👤 Membre : ${interaction.user}

📦 Item : **${pending.objet}**
➕ Quantité : **${pending.quantite}**
📂 Catégorie : **${categories[category]}**
`)
                    .setColor('Green');

                sendLog(interaction, embed);

            }

        }

    } catch (err) {

        console.error(err);

    }

});

// ================= ERROR HANDLERS =================

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= LOGIN =================

client.login(config.token);